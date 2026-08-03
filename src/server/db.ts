import crypto from "crypto";
import path from "path";
import { ensureDatabaseSchema, getDb, schema } from "../db/index";
import { and, eq, desc, asc, isNull, sql } from "drizzle-orm";
import { UserProfile, SubscriptionItem, SubscribedNode, ChatMessage, ReferralStat, NotificationItem, SiteConfig } from "../types";


export class DatabaseOperationError extends Error {
  readonly statusCode = 503;
  readonly operation: string;
  readonly cause: unknown;

  constructor(operation: string, cause?: unknown) {
    super(`We couldn't ${operation} because the account database is temporarily unavailable. Please try again shortly.`);
    this.name = "DatabaseOperationError";
    this.operation = operation;
    this.cause = cause;
  }
}

class DepositSettlementError extends Error {
  readonly statusCode = 409;
}

function databaseFailure(operation: string, error: unknown): DatabaseOperationError {
  const details = error as any;
  console.error(`[Database] ${operation} failed`, {
    code: details?.code,
    errno: details?.errno,
    sqlState: details?.sqlState,
    message: details?.message || String(error)
  });
  return new DatabaseOperationError(operation, error);
}

function requireDatabase(operation: string) {
  const drizzleDb = getDb();
  if (!drizzleDb) throw databaseFailure(operation, new Error("DATABASE_URL or MYSQL_URL is not configured"));
  return drizzleDb;
}

// --- DATABASE FUNCTIONS ---

export async function seedDatabaseIfEmpty() {
  await ensureDatabaseSchema();

  const drizzleDb = requireDatabase("initialize the account database");
  await drizzleDb.insert(schema.siteConfig).values({
    id: "main",
    configJson: {}
  }).onDuplicateKeyUpdate({ set: { id: "main" } });

  // Older releases wrote successful deposit rows but did not update the
  // account balance. Reconcile in SQL, not by loading every user and every
  // transaction into Node. The update is monotonic and therefore safe to run
  // on every restart.
  const reconciliation = await drizzleDb.execute(sql`
    UPDATE users u
    JOIN (
      SELECT user_id, SUM(amount) AS successful_deposits
      FROM transactions
      WHERE type = 'deposit'
        AND UPPER(status) IN ('SUCCESSFUL', 'COMPLETED')
      GROUP BY user_id
    ) d ON d.user_id = u.phone
    SET u.recharge_balance = u.recharge_balance + GREATEST(d.successful_deposits - u.total_deposits, 0),
        u.total_deposits = GREATEST(d.successful_deposits, u.total_deposits)
    WHERE d.successful_deposits > u.total_deposits
  `) as any;

  // Historical successful rows have already been included in the monotonic
  // reconciliation above. Mark them settled so a later webhook cannot apply
  // the same deposit a second time.
  await drizzleDb.execute(sql`
    UPDATE transactions
    SET balance_applied_at = COALESCE(balance_applied_at, CURRENT_TIMESTAMP)
    WHERE type = 'deposit'
      AND UPPER(status) IN ('SUCCESSFUL', 'COMPLETED')
      AND balance_applied_at IS NULL
  `);

  const affected = Number(reconciliation?.[0]?.affectedRows || 0);
  if (affected > 0) console.warn(`[Database] Reconciled successful deposits for ${affected} account(s).`);
}

export async function getUserProfile(phone: string): Promise<UserProfile | null> {
  const drizzleDb = requireDatabase("load your account");
  try {
      const rows = await drizzleDb.select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
      if (rows.length > 0) {
        const u = rows[0];
        const user: UserProfile = {
          phone: u.phone,
          username: u.username,
          password: u.password,
          inviteCode: u.inviteCode,
          referredByCode: u.referredByCode || "",
          operator: u.operator || "MTN",
          points: u.points,
          rechargeBalance: u.rechargeBalance,
          withdrawnCash: u.withdrawnCash,
          totalDeposits: u.totalDeposits,
          aiIncome: u.aiIncome,
          invitesCount: u.invitesCount,
          referralRewardsEarned: u.referralRewardsEarned,
          claimedVipTasks: (u.claimedVipTasks as string[]) || [],
          locked: u.locked,
          usdtAddress: u.usdtAddress || "",
          lastCheckinDate: u.lastCheckinDate || "",
          checkinStreak: u.checkinStreak,
          redeemedGiftCodes: (u.redeemedGiftCodes as string[]) || [],
          createdAt: u.createdAt
        };
        return user;
      }
  } catch (err) {
    throw databaseFailure("load your account", err);
  }
  return null;
}

export async function registerUserProfile(data: any): Promise<any> {
  const phone = data.phone || "";
  // Always generate a unique personal invite code for every newly registered user
  const personalInviteCode = "INV-" + Math.floor(100000 + Math.random() * 900000);
  const password = data.password || data.passwordHash || "";
  const referredByCode = (data.referredByCode || (data.inviteCode && data.inviteCode !== personalInviteCode ? data.inviteCode : "")).trim();

  const config = await getSiteConfig();
  const grantRegistrationBonus = data.grantRegistrationBonus !== false;
  const regBonus = grantRegistrationBonus && (config.registrationBonus !== undefined && config.registrationBonus !== null) ? Number(config.registrationBonus) : 0;
  const inviteBonusAmt = (config.inviteBonus !== undefined && config.inviteBonus !== null) ? Number(config.inviteBonus) : 0;

  const newUser: UserProfile = {
    phone,
    username: data.username || "User_" + phone.slice(-4),
    password,
    inviteCode: personalInviteCode,
    referredByCode,
    operator: data.operator || "MTN",
    points: typeof data.points === "number" ? data.points : (regBonus > 0 ? regBonus : 0), // Registration bonus credited directly to withdrawable balance!
    rechargeBalance: 0,
    withdrawnCash: 0,
    totalDeposits: 0,
    aiIncome: 0,
    invitesCount: 0,
    referralRewardsEarned: 0,
    claimedVipTasks: [],
    locked: false,
    usdtAddress: "",
    lastCheckinDate: "",
    checkinStreak: 0,
    redeemedGiftCodes: [],
    createdAt: new Date().toISOString()
  };

  // Persist the account before creating any bonus/referral ledger entries.
  // The old order could return a successful registration while the user
  // insert had failed, leaving orphaned transactions and an account that
  // could never log in.
  const drizzleDb = requireDatabase("create your account");
  try {
    await drizzleDb.insert(schema.users).values({
      phone: newUser.phone,
      username: newUser.username,
      password: newUser.password || "",
      inviteCode: newUser.inviteCode,
      referredByCode: newUser.referredByCode,
      operator: newUser.operator,
      points: newUser.points,
      rechargeBalance: newUser.rechargeBalance,
      withdrawnCash: newUser.withdrawnCash,
      totalDeposits: newUser.totalDeposits,
      aiIncome: newUser.aiIncome,
      invitesCount: newUser.invitesCount,
      referralRewardsEarned: newUser.referralRewardsEarned,
      claimedVipTasks: newUser.claimedVipTasks,
      locked: newUser.locked,
      usdtAddress: newUser.usdtAddress,
      lastCheckinDate: newUser.lastCheckinDate,
      checkinStreak: newUser.checkinStreak,
      redeemedGiftCodes: newUser.redeemedGiftCodes,
      createdAt: newUser.createdAt
    });
  } catch (err) {
    throw databaseFailure("create your account", err);
  }


  // If Registration Bonus configured, record transaction & alert notification for new user
  if (regBonus > 0) {
    await saveTransaction({
      id: "reg_bonus_" + crypto.randomBytes(8).toString("hex"),
      userId: phone,
      type: "gift",
      amount: regBonus,
      currency: "UGX",
      status: "SUCCESSFUL",
      paymentMethod: "REGISTRATION_BONUS",
      phone: phone,
      itemId: "welcome_bonus",
      mode: "auto",
      timestamp: new Date().toISOString()
    });

    await createNotification(
      phone,
      "Welcome Registration Bonus!",
      `🎉 Welcome to our platform! You received a registration bonus of UGX ${regBonus.toLocaleString()} credited directly to your withdrawable balance.`,
      "register"
    );
  }

  // Handle Referrer Base Invite Bonus!
  if (newUser.referredByCode) {
    const targetRefCode = newUser.referredByCode.toUpperCase();
    let referrer: UserProfile | null = null;
    
    referrer = await getUserProfile(newUser.referredByCode);
    if (!referrer) {
      const drizzleDb = getDb();
      if (drizzleDb) {
        const rows = await drizzleDb.select().from(schema.users)
          .where(eq(schema.users.inviteCode, targetRefCode)).limit(1);
        if (rows[0]) referrer = await getUserProfile(rows[0].phone);
      }
    }

    if (referrer) {
      referrer.invitesCount = (referrer.invitesCount || 0) + 1;
      
      if (inviteBonusAmt > 0) {
        referrer.points = (referrer.points || 0) + inviteBonusAmt; // Base Invite Bonus to withdrawable balance!
        referrer.referralRewardsEarned = (referrer.referralRewardsEarned || 0) + inviteBonusAmt;

        // Record transaction for referrer
        await saveTransaction({
          id: "ref_bonus_" + crypto.randomBytes(8).toString("hex"),
          userId: referrer.phone,
          type: "referral",
          amount: inviteBonusAmt,
          currency: "UGX",
          status: "SUCCESSFUL",
          paymentMethod: "BASE_INVITE_BONUS",
          phone: referrer.phone,
          itemId: newUser.phone,
          mode: "auto",
          timestamp: new Date().toISOString()
        });

        // Create notification alert for referrer
        await createNotification(
          referrer.phone,
          "New Referral Signup Bonus!",
          `🎉 User ${newUser.phone} registered using your invite code (${newUser.referredByCode})! Base Invite Bonus of UGX ${inviteBonusAmt.toLocaleString()} has been credited to your withdrawable balance!`,
          "rewards"
        );
      }

      await updateUserProfile(referrer.phone, {
        invitesCount: referrer.invitesCount,
        points: referrer.points,
        referralRewardsEarned: referrer.referralRewardsEarned
      });
    }
  }

  return { success: true, profile: newUser, ...newUser };
}

export async function loginUser(phone: string, pass: string): Promise<UserProfile | null> {
  const user = await getUserProfile(phone);
  if (user && user.password === pass) {
    if (user.locked) {
      throw new Error("Account locked. Please contact support.");
    }
    return user;
  }
  return null;
}

export async function updateUserProfile(
  phone: string,
  updatesOrUsername: any,
  operator?: string,
  customPhone?: string,
  newPassword?: string,
  usdtAddress?: string
): Promise<UserProfile> {
  let updates: Partial<UserProfile> = {};
  if (typeof updatesOrUsername === "object" && updatesOrUsername !== null) {
    updates = updatesOrUsername;
  } else {
    updates = {
      username: updatesOrUsername,
      operator: operator as any,
      usdtAddress: usdtAddress || undefined
    };
    if (newPassword) updates.password = newPassword;
  }

  const existing = (await getUserProfile(phone)) || {
    phone,
    username: "",
    password: "",
    inviteCode: "",
    referredByCode: "",
    operator: "MTN",
    points: 0,
    rechargeBalance: 0,
    withdrawnCash: 0,
    totalDeposits: 0,
    aiIncome: 0,
    invitesCount: 0,
    referralRewardsEarned: 0,
    claimedVipTasks: [],
    locked: false,
    usdtAddress: "",
    lastCheckinDate: "",
    checkinStreak: 0,
    redeemedGiftCodes: [],
    createdAt: new Date().toISOString()
  };

  const updated: UserProfile = { ...existing, ...updates };

  const drizzleDb = requireDatabase("save your account changes");
  try {
      await drizzleDb.update(schema.users).set({
        username: updated.username,
        password: updated.password || "",
        operator: updated.operator,
        points: updated.points,
        rechargeBalance: updated.rechargeBalance,
        withdrawnCash: updated.withdrawnCash,
        totalDeposits: updated.totalDeposits,
        aiIncome: updated.aiIncome,
        invitesCount: updated.invitesCount,
        referralRewardsEarned: updated.referralRewardsEarned,
        claimedVipTasks: updated.claimedVipTasks,
        locked: updated.locked,
        usdtAddress: updated.usdtAddress,
        lastCheckinDate: updated.lastCheckinDate,
        checkinStreak: updated.checkinStreak,
        redeemedGiftCodes: updated.redeemedGiftCodes
      }).where(eq(schema.users.phone, phone));
  } catch (err) {
    throw databaseFailure("save your account changes", err);
  }

  return updated;
}

export async function getSubscriptionItems(): Promise<SubscriptionItem[]> {
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      const rows = await drizzleDb.select().from(schema.catalogProducts);
      if (rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          name: r.name,
          image: r.image,
          imageUrl: r.imageUrl || r.image,
          amount: r.amount,
          duration: r.duration,
          dailyYield: r.dailyYield,
          category: r.category as any,
          inviteBonusPercent: r.inviteBonusPercent,
          outOfStock: r.outOfStock,
          disabled: r.disabled
        }));
      }
    } catch (err) {
      console.warn("[Database] getSubscriptionItems error:", err);
    }
  }
  return [];
}

export async function subscribeToItem(phone: string, itemId: string): Promise<SubscribedNode> {
  const user = await getUserProfile(phone);
  if (!user) throw new Error("User not found");

  const catalog = await getSubscriptionItems();
  const item = catalog.find(c => c.id === itemId);
  if (!item) throw new Error("Subscription package not found");

  if ((user.rechargeBalance || 0) < item.amount) {
    throw new Error("Insufficient recharge balance. Please deposit funds first.");
  }

  // Deduct rental cost from recharge balance
  user.rechargeBalance = (user.rechargeBalance || 0) - item.amount;
  
  // IMMEDIATELY auto-credit 1st day daily yield to withdrawable balance (points)!
  const immediateYield = item.dailyYield || 0;
  user.points = (user.points || 0) + immediateYield;
  user.aiIncome = (user.aiIncome || 0) + immediateYield;

  await updateUserProfile(phone, {
    rechargeBalance: user.rechargeBalance,
    points: user.points,
    aiIncome: user.aiIncome
  });

  const now = new Date();
  const endDate = new Date(now.getTime() + item.duration * 24 * 60 * 60 * 1000);

  const node: SubscribedNode = {
    id: "sub_" + crypto.randomBytes(8).toString("hex"),
    userId: phone,
    itemId: item.id,
    itemName: item.name,
    image: item.image,
    amount: item.amount,
    duration: item.duration,
    dailyYield: item.dailyYield,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    lastClaimedDate: now.toISOString().split("T")[0],
    totalEarned: immediateYield,
    status: "active"
  };


  // Record node activation rental transaction
  await saveTransaction({
    id: "gpu_" + crypto.randomBytes(8).toString("hex"),
    userId: phone,
    type: "gpu",
    amount: item.amount,
    currency: "UGX",
    status: "SUCCESSFUL",
    paymentMethod: "RECHARGE_BALANCE",
    phone: phone,
    itemId: item.id,
    mode: "auto",
    timestamp: now.toISOString()
  });

  // Record immediate initial yield payout transaction
  if (immediateYield > 0) {
    await saveTransaction({
      id: "yield_init_" + crypto.randomBytes(8).toString("hex"),
      userId: phone,
      type: "yield",
      amount: immediateYield,
      currency: "UGX",
      status: "SUCCESSFUL",
      paymentMethod: "DAY_1_IMMEDIATE_YIELD",
      phone: phone,
      itemId: item.id,
      mode: "auto",
      timestamp: now.toISOString()
    });
  }

  // Create alert/notification for renting the product!
  await createNotification(
    phone,
    "Product Activated!",
    `🎉 Congratulations! You successfully rented "${item.name}". Your product is active and Day 1 yield of UGX ${immediateYield.toLocaleString()} has been immediately credited to your withdrawable balance.`,
    "rewards"
  );

  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.insert(schema.subscribedNodes).values({
        id: node.id,
        userId: node.userId,
        itemId: node.itemId,
        itemName: node.itemName,
        image: node.image,
        amount: node.amount,
        duration: node.duration,
        dailyYield: node.dailyYield,
        startDate: node.startDate,
        endDate: node.endDate,
        lastClaimedDate: node.lastClaimedDate,
        totalEarned: node.totalEarned,
        status: node.status
      });
    } catch (err) {
      console.warn("[Database] subscribeToItem error:", err);
    }
  }

  if (user.referredByCode && item.inviteBonusPercent > 0) {
    await distributeReferralBonus(user.referredByCode, item.amount, item.inviteBonusPercent);
  }

  return node;
}

export async function distributeReferralBonus(referrerCodeOrPhone: string, amountOrItemId?: any, percent?: number) {
  const siteConfig = await getSiteConfig();
  const lvl1Pct = percent !== undefined ? percent : (siteConfig.level1InviteIncomePct !== undefined ? siteConfig.level1InviteIncomePct : 15);
  const lvl2Pct = siteConfig.level2InviteIncomePct !== undefined ? siteConfig.level2InviteIncomePct : 5;

  if (typeof amountOrItemId !== "number") return;

  const drizzleDb = getDb();
  if (!drizzleDb) return;
  const allUsers = await drizzleDb.select().from(schema.users);
  const matches = (u: typeof allUsers[number], ref: string) =>
    u.phone === ref || (u.inviteCode || "").toUpperCase() === ref.toUpperCase();

  const level1Row = allUsers.find(u => matches(u, referrerCodeOrPhone));
  if (!level1Row) return;

  const level1Bonus = (amountOrItemId * lvl1Pct) / 100;
  await drizzleDb.update(schema.users).set({
    points: level1Row.points + level1Bonus,
    referralRewardsEarned: level1Row.referralRewardsEarned + level1Bonus
  }).where(eq(schema.users.phone, level1Row.phone));

  if (level1Row.referredByCode) {
    const level2Row = allUsers.find(u => matches(u, level1Row.referredByCode || ""));
    if (level2Row) {
      const level2Bonus = (amountOrItemId * lvl2Pct) / 100;
      await drizzleDb.update(schema.users).set({
        points: level2Row.points + level2Bonus,
        referralRewardsEarned: level2Row.referralRewardsEarned + level2Bonus
      }).where(eq(schema.users.phone, level2Row.phone));
    }
  }
}

export async function getUserSubscriptions(phone: string): Promise<SubscribedNode[]> {
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      const rows = await drizzleDb.select().from(schema.subscribedNodes).where(eq(schema.subscribedNodes.userId, phone));
      if (rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          userId: r.userId,
          itemId: r.itemId,
          itemName: r.itemName,
          image: r.image,
          amount: r.amount,
          duration: r.duration,
          dailyYield: r.dailyYield,
          startDate: r.startDate,
          endDate: r.endDate,
          lastClaimedDate: r.lastClaimedDate,
          totalEarned: r.totalEarned,
          status: r.status as any
        }));
      }
    } catch (err) {
      console.warn("[Database] getUserSubscriptions error:", err);
    }
  }
  return [];
}

export async function getUserTransactions(phone: string): Promise<any[]> {
  let list: any[] = [];
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      list = await drizzleDb.select().from(schema.transactions).where(eq(schema.transactions.userId, phone));
    } catch (err) {
      console.warn("[Database] getUserTransactions error:", err);
    }
  }
  return list.sort((a, b) => {
    const tA = new Date(a.timestamp || a.createdAt || a.date || 0).getTime();
    const tB = new Date(b.timestamp || b.createdAt || b.date || 0).getTime();
    return tB - tA; // Newest first
  });
}

export async function claimDailyReward(arg1: string, arg2: string): Promise<{ success: boolean; reward: number }> {
  let subId = arg1;
  let phone = arg2;
  if (!arg1.startsWith("sub_") && arg2.startsWith("sub_")) {
    phone = arg1;
    subId = arg2;
  }

  const subs = await getUserSubscriptions(phone);
  const sub = subs.find(s => s.id === subId);
  if (!sub) throw new Error("Subscription node not found");

  const today = new Date().toISOString().split("T")[0];
  if (sub.lastClaimedDate === today) {
    throw new Error("Daily yield already collected today.");
  }

  sub.lastClaimedDate = today;
  sub.totalEarned += sub.dailyYield;

  const user = await getUserProfile(phone);
  if (user) {
    user.points += sub.dailyYield;
    user.aiIncome = (user.aiIncome || 0) + sub.dailyYield;
    await updateUserProfile(phone, { points: user.points, aiIncome: user.aiIncome });
  }

  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.update(schema.subscribedNodes).set({
        lastClaimedDate: sub.lastClaimedDate,
        totalEarned: sub.totalEarned
      }).where(eq(schema.subscribedNodes.id, sub.id));
    } catch (err) {
      console.warn("[Database] claimDailyReward update error:", err);
    }
  }

  return { success: true, reward: sub.dailyYield };
}

// Withdrawal Request (Puts status in PENDING so admin can review)
export async function requestCashout(phone: string, amount: number, paymentMethodOrTransId?: string, mode?: string, withdrawPhone?: string, operator?: string): Promise<any> {
  const user = await getUserProfile(phone);
  if (!user) throw new Error("User not found");

  if (user.points < amount) {
    throw new Error("Insufficient withdrawable balance (points).");
  }

  const siteConfig = await getSiteConfig();
  const currentWithdrawMode = mode || siteConfig.withdrawMode || "manual";
  const isAuto = currentWithdrawMode === "automatic";

  user.points -= amount;
  if (isAuto) {
    user.withdrawnCash = (user.withdrawnCash || 0) + amount;
  }
  const updatedProfile = await updateUserProfile(phone, { points: user.points, withdrawnCash: user.withdrawnCash });

  const txId = paymentMethodOrTransId || "tx_" + crypto.randomBytes(8).toString("hex");
  const tx = {
    id: txId,
    userId: phone,
    type: "withdrawal",
    amount,
    currency: "UGX",
    status: isAuto ? "COMPLETED" : "PENDING",
    paymentMethod: operator || paymentMethodOrTransId || "MTN",
    phone: withdrawPhone || phone,
    usdtAddress: operator === "USDT" ? (withdrawPhone || "") : "",
    timestamp: new Date().toISOString(),
    profile: updatedProfile
  };


  if (isAuto) {
    await createNotification(
      phone,
      "Withdrawal Approved",
      `Your withdrawal request of UGX ${amount.toLocaleString()} (${tx.paymentMethod}) was automatically processed and completed!`,
      "withdraw"
    );
    await sendChatMessage({
      roomId: "shared",
      sender: "system",
      senderName: "SYSTEM BROADCAST",
      text: `💸 User ${phone.slice(0, 4)}*** automatically withdrew UGX ${amount.toLocaleString()} (${tx.paymentMethod})!`
    });
  } else {
    await createNotification(
      phone,
      "Withdrawal Request Submitted",
      `Your withdrawal request of UGX ${amount.toLocaleString()} (${tx.paymentMethod}) was submitted and is currently pending admin review.`,
      "withdraw"
    );
    await sendChatMessage({
      roomId: "shared",
      sender: "system",
      senderName: "SYSTEM BROADCAST",
      text: `💸 User ${phone.slice(0, 4)}*** submitted a withdrawal request of UGX ${amount.toLocaleString()} (${tx.paymentMethod})!`
    });
  }

  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.insert(schema.transactions).values({
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        paymentMethod: tx.paymentMethod,
        phone: tx.phone,
        usdtAddress: tx.usdtAddress,
        timestamp: tx.timestamp
      });
    } catch (err) {
      console.warn("[Database] requestCashout error:", err);
    }
  }

  return tx;
}


export async function getReferreeStatsList(phoneOrCode: string): Promise<ReferralStat[]> {
  const drizzleDb = getDb();
  if (!drizzleDb) return [];
  
  const userRows = await drizzleDb.select().from(schema.users).where(eq(schema.users.phone, phoneOrCode));
  if (userRows.length === 0) {
    const userRowsCode = await drizzleDb.select().from(schema.users).where(eq(schema.users.inviteCode, phoneOrCode));
    if (userRowsCode.length === 0) return [];
    phoneOrCode = userRowsCode[0].phone;
  }
  
  const user = (await drizzleDb.select().from(schema.users).where(eq(schema.users.phone, phoneOrCode)))[0];
  const userInviteCode = user.inviteCode;
  const userPhone = user.phone;

  const siteConfig = await getSiteConfig();
  const lvl1Pct = siteConfig?.level1InviteIncomePct !== undefined ? siteConfig.level1InviteIncomePct : 10;
  const lvl2Pct = siteConfig?.level2InviteIncomePct !== undefined ? siteConfig.level2InviteIncomePct : 5;

  const allUsers = await drizzleDb.select().from(schema.users);
  const allSubs = await drizzleDb.select().from(schema.subscriptions);
  
  const stats: ReferralStat[] = [];
  const level1Users = [];

  for (const u of allUsers) {
    const refCode = (u.referredByCode || "").trim().toUpperCase();
    if (refCode && (refCode === userInviteCode.toUpperCase() || refCode === userPhone.toUpperCase())) {
      level1Users.push(u);
      const userSubs = allSubs.filter(s => s.userId === u.phone && s.status === "active");
      const totalSpent = userSubs.reduce((sum, s) => sum + s.amount, 0);
      const rewardAmount = (totalSpent * lvl1Pct) / 100;
      stats.push({
        phone: u.phone,
        level: 1,
        joinedDate: u.createdAt || "",
        rewardAmount,
        activeProductsCount: userSubs.length
      });
    }
  }

  for (const l1User of level1Users) {
    const l1Code = (l1User.inviteCode || "").trim().toUpperCase();
    const l1Phone = (l1User.phone || "").trim().toUpperCase();
    for (const u of allUsers) {
      const refCode = (u.referredByCode || "").trim().toUpperCase();
      if (refCode && (refCode === l1Code || refCode === l1Phone)) {
        const userSubs = allSubs.filter(s => s.userId === u.phone && s.status === "active");
        const totalSpent = userSubs.reduce((sum, s) => sum + s.amount, 0);
        const rewardAmount = (totalSpent * lvl2Pct) / 100;
        stats.push({
          phone: u.phone,
          level: 2,
          joinedDate: u.createdAt || "",
          rewardAmount,
          activeProductsCount: userSubs.length
        });
      }
    }
  }
  return stats;
}


export async function getChatMessages(roomId: string = "global"): Promise<ChatMessage[]> {
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      const rows = await drizzleDb.select().from(schema.chatMessages).where(eq(schema.chatMessages.roomId, roomId)).orderBy(asc(schema.chatMessages.timestamp)).limit(500);
      if (rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          roomId: r.roomId,
          sender: r.sender,
          senderName: r.senderName,
          text: r.text,
          image: r.image || undefined,
          timestamp: r.timestamp
        }));
      }
    } catch (err) {
      console.warn("[Database] getChatMessages error:", err);
    }
  }
  return [];
}

export async function sendChatMessage(roomIdOrMsg: any, sender?: string, senderName?: string, text?: string, image?: string): Promise<ChatMessage> {
  let msg: ChatMessage;
  if (typeof roomIdOrMsg === "object" && roomIdOrMsg !== null) {
    msg = {
      id: "msg_" + crypto.randomBytes(8).toString("hex"),
      roomId: roomIdOrMsg.roomId || "global",
      sender: roomIdOrMsg.sender,
      senderName: roomIdOrMsg.senderName,
      text: roomIdOrMsg.text || "",
      image: roomIdOrMsg.image,
      timestamp: new Date().toISOString()
    };
  } else {
    msg = {
      id: "msg_" + crypto.randomBytes(8).toString("hex"),
      roomId: roomIdOrMsg || "global",
      sender: sender || "",
      senderName: senderName || "",
      text: text || "",
      image,
      timestamp: new Date().toISOString()
    };
  }


  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.insert(schema.chatMessages).values({
        id: msg.id,
        roomId: msg.roomId,
        sender: msg.sender,
        senderName: msg.senderName,
        text: msg.text,
        image: msg.image || null,
        timestamp: msg.timestamp
      });
    } catch (err) {
      console.warn("[Database] sendChatMessage error:", err);
    }
  }

  return msg;
}


export async function fetchSystemDashboardStats() {
  const drizzleDb = requireDatabase("load dashboard statistics");
  try {
    const [userCount, nodeCount, depositTotals, withdrawalTotals] = await Promise.all([
      drizzleDb.select({ count: sql<number>`count(*)` }).from(schema.users),
      drizzleDb.select({ count: sql<number>`count(*)` }).from(schema.subscribedNodes).where(eq(schema.subscribedNodes.status, "active")),
      drizzleDb.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(schema.transactions)
        .where(sql`type in ('deposit', 'balance') and upper(status) in ('SUCCESSFUL', 'COMPLETED')`),
      drizzleDb.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(schema.transactions)
        .where(sql`type in ('withdrawal', 'withdraw') and upper(status) in ('SUCCESSFUL', 'COMPLETED')`)
    ]);

    return {
      totalUsers: Number(userCount[0]?.count || 0),
      totalDeposits: Number(depositTotals[0]?.total || 0),
      totalWithdrawals: Number(withdrawalTotals[0]?.total || 0),
      activeNodes: Number(nodeCount[0]?.count || 0),
      onlineUsers: 0
    };
  } catch (err) {
    throw databaseFailure("load dashboard statistics", err);
  }
}


export async function createNotification(phone: string, title: string, message: string, category: string = "system") {
  const notif: NotificationItem = {
    id: "notif_" + crypto.randomBytes(8).toString("hex"),
    userId: phone,
    title,
    message,
    category,
    timestamp: new Date().toISOString()
  };

  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.insert(schema.notifications).values({
        id: notif.id,
        userId: notif.userId,
        title: notif.title,
        message: notif.message,
        category: notif.category,
        timestamp: notif.timestamp
      });
    } catch (err) {
      console.warn("[Database] createNotification error:", err);
    }
  }
  return notif;
}

export async function getUserNotifications(phone: string): Promise<NotificationItem[]> {
  const drizzleDb = getDb();
  if (drizzleDb) {
    const notifs = await drizzleDb.select().from(schema.notifications).where(eq(schema.notifications.userId, phone)).orderBy(desc(schema.notifications.timestamp));
    const ancs = await drizzleDb.select().from(schema.announcements).orderBy(desc(schema.announcements.createdAt));
    
    const directLogs = notifs.map(n => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      category: n.category,
      timestamp: n.timestamp,
      read: false
    }));

    const announcementsList = ancs.map(anc => ({
      id: anc.id,
      userId: phone,
      title: anc.title,
      message: anc.message,
      category: anc.category || "news",
      timestamp: anc.createdAt || new Date().toISOString(),
      read: false,
      metadata: {
        tag: anc.tag || "ANNOUNCEMENT",
        imageUrl: anc.imageUrl,
        link: anc.readMoreLink,
        alertUsers: true
      }
    }));

    const combined = [...directLogs, ...announcementsList];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  return [];
}

export async function processDeposit(phone: string, amount: number, operator?: string, depositPhone?: string): Promise<UserProfile> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Deposit amount must be greater than zero.");
  const user = await getUserProfile(phone);
  if (!user) throw new Error("The account for this deposit could not be found.");
  const transactionId = "tx_" + crypto.randomBytes(16).toString("hex");

  // Direct/legacy deposits still go through the same ledger-first settlement
  // path as gateway webhooks. There is deliberately no read-modify-write of
  // the user row here: concurrent requests must be serialized by MySQL.
  await saveTransaction({
    id: transactionId,
    userId: phone,
    type: "deposit",
    amount,
    currency: "UGX",
    status: "SUCCESSFUL",
    paymentMethod: operator || "MTN",
    phone: depositPhone || phone,
    operator: operator || "",
    mode: "direct",
    timestamp: new Date().toISOString()
  });

  return completeSuccessfulDeposit(phone, amount, depositPhone, operator, transactionId);
}

export async function saveTransaction(
  txOrId: any,
  phone?: string,
  amount?: number,
  type?: string,
  depositPhone?: string,
  operator?: string,
  itemId?: string,
  mode?: string
) {
  let tx: any;
  if (typeof txOrId === "object" && txOrId !== null) {
    tx = txOrId;
  } else {
    tx = {
      id: txOrId,
      userId: phone || "",
      type: type || "deposit",
      amount: amount || 0,
      currency: "UGX",
      status: "pending",
      paymentMethod: operator || "MTN",
      phone: depositPhone || phone || "",
      itemId: itemId || "",
      mode: mode || "online",
      timestamp: new Date().toISOString()
    };
  }

  const drizzleDb = requireDatabase("save the transaction");
  try {
      await drizzleDb.insert(schema.transactions).values({
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency || "UGX",
        status: tx.status || "pending",
        paymentMethod: tx.paymentMethod || "",
        phone: tx.phone || "",
        usdtAddress: tx.usdtAddress || "",
        itemId: tx.itemId || "",
        operator: tx.operator || "",
        mode: tx.mode || "",
        metadata: tx.metadata || null,
        balanceAppliedAt: tx.balanceAppliedAt || null,
        timestamp: tx.timestamp || new Date().toISOString()
      });
  } catch (err) {
    throw databaseFailure("save the transaction", err);
  }
}

export async function getTransaction(txId: string) {
  const drizzleDb = requireDatabase("load the transaction");
  try {
    const rows = await drizzleDb.select().from(schema.transactions)
      .where(eq(schema.transactions.id, txId)).limit(1);
    return rows[0] || null;
  } catch (err) {
    throw databaseFailure("load the transaction", err);
  }
}

export async function completeSuccessfulDeposit(
  userIdOrTxId: string,
  amount?: number,
  phone?: string,
  operator?: string,
  transId?: string
): Promise<UserProfile> {
  const transactionId = transId || userIdOrTxId;
  const drizzleDb = requireDatabase("settle the deposit");

  try {
    await drizzleDb.transaction(async (tx) => {
      const rows = await tx.select().from(schema.transactions)
        .where(eq(schema.transactions.id, transactionId))
        .limit(1)
        .for("update");
      const transaction = rows[0];
      if (!transaction) throw new DepositSettlementError("Payment transaction was not found. It may not have been recorded yet.");
      if (transaction.type !== "deposit") throw new DepositSettlementError("The transaction is not a deposit.");
      if (String(transaction.status).toUpperCase() === "FAILED") throw new DepositSettlementError("This deposit was already rejected.");

      // balanceAppliedAt is the idempotency key. A webhook, status poll, or
      // admin click can safely repeat this function without double-crediting.
      if (!transaction.balanceAppliedAt) {
        const userRows = await tx.select().from(schema.users)
          .where(eq(schema.users.phone, transaction.userId))
          .limit(1)
          .for("update");
        const user = userRows[0];
        if (!user) throw new DepositSettlementError("The account for this deposit no longer exists.");

        await tx.update(schema.users).set({
          rechargeBalance: sql`${schema.users.rechargeBalance} + ${transaction.amount}`,
          totalDeposits: sql`${schema.users.totalDeposits} + ${transaction.amount}`
        }).where(eq(schema.users.phone, user.phone));

        await tx.update(schema.transactions).set({
          status: "SUCCESSFUL",
          balanceAppliedAt: new Date().toISOString()
        }).where(and(
          eq(schema.transactions.id, transaction.id),
          isNull(schema.transactions.balanceAppliedAt)
        ));
      } else if (String(transaction.status).toUpperCase() !== "SUCCESSFUL") {
        await tx.update(schema.transactions).set({ status: "SUCCESSFUL" })
          .where(eq(schema.transactions.id, transaction.id));
      }
    });
  } catch (err: any) {
    if (err instanceof DatabaseOperationError || err instanceof DepositSettlementError) throw err;
    throw databaseFailure("settle the deposit", err);
  }

  const settledTransaction = await getTransaction(transactionId);
  const settledUser = await getUserProfile(settledTransaction?.userId || userIdOrTxId);
  if (!settledUser) throw new Error("Deposit was settled, but the account could not be reloaded.");
  return settledUser;
}


export async function completeSuccessfulWithdrawal(txId: string): Promise<any> {
  const drizzleDb = getDb();
  if (drizzleDb) {
    const rows = await drizzleDb.select().from(schema.transactions).where(eq(schema.transactions.id, txId));
    if (rows.length > 0) {
      await drizzleDb.update(schema.transactions).set({ status: "completed" }).where(eq(schema.transactions.id, txId));
      return { status: "completed" };
    }
  }
  throw new Error("Transaction not found or DB not connected");
}


export async function completeSuccessfulGpuActivation(
  userId: string,
  itemId?: string,
  transId?: string,
  phone?: string,
  operator?: string,
  amount?: number
): Promise<SubscribedNode> {
  const targetUser = phone || userId;
  const targetItem = itemId || "ds_node_1";
  return await subscribeToItem(targetUser, targetItem);
}


export async function completeFailedTransaction(txId: string) {
  const drizzleDb = getDb();
  if (drizzleDb) {
    const rows = await drizzleDb.select().from(schema.transactions).where(eq(schema.transactions.id, txId));
    if (rows.length > 0) {
      const tx = rows[0];
      await drizzleDb.update(schema.transactions).set({ status: "failed" }).where(eq(schema.transactions.id, txId));
      // Refund balance
      if (tx.type === "withdrawal" || tx.type === "withdraw") {
        const userRows = await drizzleDb.select().from(schema.users).where(eq(schema.users.phone, tx.userId));
        if (userRows.length > 0) {
          const user = userRows[0];
          await drizzleDb.update(schema.users).set({ points: (user.points || 0) + tx.amount }).where(eq(schema.users.phone, user.phone));
        }
      }
      return { status: "failed" };
    }
  }
  throw new Error("Transaction not found or DB not connected");
}


export async function autoCollectUserYields(phone: string) {
  const subs = await getUserSubscriptions(phone);
  let totalClaimed = 0;
  for (const sub of subs) {
    try {
      const res = await claimDailyReward(phone, sub.id);
      if (res.success) totalClaimed += res.reward;
    } catch (e) {
      // already claimed today
    }
  }
  return totalClaimed;
}

export async function flushDatabase(): Promise<{ success: boolean; deletedCount: number }> {
  const drizzleDb = getDb();
  if (!drizzleDb) throw new Error("Database not connected");
  const tables = [
    schema.notifications,
    schema.chatMessages,
    schema.transactions,
    schema.subscribedNodes,
    schema.giftCodes,
    schema.catalogProducts,
    schema.announcements,
    schema.users
  ];
  let deletedCount = 0;
  for (const table of tables) {
    const rows = await drizzleDb.select().from(table);
    deletedCount += rows.length;
    await drizzleDb.delete(table);
  }
  await seedDatabaseIfEmpty();
  return { success: true, deletedCount };
}

export async function adminGetAllUsers(): Promise<UserProfile[]> {
  let list: UserProfile[] = [];
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      const rows = await drizzleDb.select().from(schema.users);
      if (rows.length > 0) {
        list = rows.map(u => ({
          phone: u.phone,
          username: u.username,
          password: u.password,
          inviteCode: u.inviteCode,
          referredByCode: u.referredByCode || "",
          operator: u.operator || "MTN",
          points: u.points,
          rechargeBalance: u.rechargeBalance,
          withdrawnCash: u.withdrawnCash,
          totalDeposits: u.totalDeposits,
          aiIncome: u.aiIncome,
          invitesCount: u.invitesCount,
          referralRewardsEarned: u.referralRewardsEarned,
          claimedVipTasks: (u.claimedVipTasks as string[]) || [],
          locked: u.locked,
          usdtAddress: u.usdtAddress || "",
          lastCheckinDate: u.lastCheckinDate || "",
          checkinStreak: u.checkinStreak,
          redeemedGiftCodes: (u.redeemedGiftCodes as string[]) || [],
          createdAt: u.createdAt
        }));
      }
    } catch (err) {
      console.warn("[Database] adminGetAllUsers error:", err);
    }
  }

  // Attach accurate active products count for every user profile
  const allSubs = drizzleDb
    ? await drizzleDb.select().from(schema.subscribedNodes)
    : [];
  const subsByUser = new Map<string, typeof allSubs>();
  for (const sub of allSubs) {
    const current = subsByUser.get(sub.userId);
    if (current) current.push(sub);
    else subsByUser.set(sub.userId, [sub]);
  }
  return list.map(u => {
    const userActiveSubs = (subsByUser.get(u.phone) || []).filter(s => s.status === "active");
    return {
      ...u,
      activeNodesCount: userActiveSubs.length,
      activeProductsCount: userActiveSubs.length,
      activeSubscriptions: userActiveSubs
    } as any;
  });
}

export async function adminOverridePassword(phone: string, newPass: string) {
  return await updateUserProfile(phone, { password: newPass });
}

export async function adminGetAllTransactions(): Promise<any[]> {
  let list: any[] = [];
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      list = await drizzleDb.select().from(schema.transactions);
    } catch (err) {
      console.warn("[Database] adminGetAllTransactions error:", err);
    }
  }
  return list.sort((a, b) => {
    const tA = new Date(a.timestamp || a.createdAt || a.date || 0).getTime();
    const tB = new Date(b.timestamp || b.createdAt || b.date || 0).getTime();
    return tB - tA; // Newest first
  });
}


export async function adminUpdateTransactionStatus(txId: string, status: string) {
  const normalizedStatus = String(status || "").toUpperCase();
  if (!["PENDING", "SUCCESSFUL", "COMPLETED", "FAILED"].includes(normalizedStatus)) {
    throw new Error("Unsupported transaction status.");
  }
  const transaction = await getTransaction(txId);
  if (!transaction) throw new Error("Transaction was not found.");

  if (normalizedStatus === "SUCCESSFUL" || normalizedStatus === "COMPLETED") {
    if (transaction.type === "deposit") {
      await completeSuccessfulDeposit(transaction.userId, transaction.amount, transaction.phone || undefined, transaction.operator || undefined, transaction.id);
      return { status: "SUCCESSFUL" };
    }
    return await completeSuccessfulWithdrawal(txId);
  }

  const drizzleDb = requireDatabase("update the transaction status");
  try {
    await drizzleDb.update(schema.transactions).set({ status: normalizedStatus }).where(eq(schema.transactions.id, txId));
    if (normalizedStatus === "FAILED" && (transaction.type === "withdrawal" || transaction.type === "withdraw")) {
      await drizzleDb.update(schema.users).set({
        points: sql`${schema.users.points} + ${transaction.amount}`
      }).where(eq(schema.users.phone, transaction.userId));
    }
    return { status: normalizedStatus };
  } catch (err) {
    throw databaseFailure("update the transaction status", err);
  }
}


export async function adminGetCatalogItems() {
  const items = await getSubscriptionItems();
  const drizzleDb = getDb();
  const allSubs = drizzleDb ? await drizzleDb.select().from(schema.subscribedNodes) : [];

  // Attach activeSubscribers count to each product item
  return items.map(item => {
    const activeSubCount = allSubs.filter(s => s.itemId === item.id && s.status === "active").length;
    return {
      ...item,
      activeSubscribers: activeSubCount
    };
  });
}

export async function adminSaveCatalogItem(item: SubscriptionItem) {
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.insert(schema.catalogProducts).values({
        id: item.id,
        name: item.name,
        image: item.image,
        imageUrl: item.imageUrl || item.image,
        amount: item.amount,
        duration: item.duration,
        dailyYield: item.dailyYield,
        category: item.category || "DS",
        inviteBonusPercent: item.inviteBonusPercent || 0,
        outOfStock: item.outOfStock || false,
        disabled: item.disabled || false
      }).onDuplicateKeyUpdate({ set: { name: item.name, amount: item.amount, dailyYield: item.dailyYield } });
    } catch (err) {
      console.warn("[Database] adminSaveCatalogItem error:", err);
    }
  }
}

export async function adminDeleteCatalogItem(itemId: string) {
  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.delete(schema.catalogProducts).where(eq(schema.catalogProducts.id, itemId));
    } catch (err) {
      console.warn("[Database] adminDeleteCatalogItem error:", err);
    }
  }
}


export async function adminDeleteAllCatalogItems(): Promise<{ count: number }> {
  const drizzleDb = getDb();
  if (drizzleDb) {
    const rows = await drizzleDb.select().from(schema.catalogProducts);
    await drizzleDb.delete(schema.catalogProducts);
    return { count: rows.length };
  }
  return { count: 0 };
}


export async function adminCreateGiftCode(code: string, amount: number, maxRedemptions: number = 1, expiryDate?: string) {
  const gift = {
    id: "gift_" + crypto.randomBytes(6).toString("hex"),
    code: code.toUpperCase(),
    amount,
    maxRedemptions,
    currentRedemptions: 0,
    expiryDate: expiryDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    status: "active",
    createdAt: new Date().toISOString()
  };

  const drizzleDb = getDb();
  if (drizzleDb) {
    try {
      await drizzleDb.insert(schema.giftCodes).values({
        id: gift.id,
        code: gift.code,
        amount: gift.amount,
        maxRedemptions: gift.maxRedemptions,
        currentRedemptions: gift.currentRedemptions,
        expiryDate: gift.expiryDate,
        status: gift.status,
        createdAt: gift.createdAt
      });
    } catch (err) {
      console.warn("[Database] adminCreateGiftCode error:", err);
    }
  }
  return gift;
}

export async function adminGetGiftCodes() {
  const drizzleDb = getDb();
  if (!drizzleDb) return [];
  return drizzleDb.select().from(schema.giftCodes).orderBy(desc(schema.giftCodes.createdAt));
}

export async function adminDeleteGiftCode(code: string) {
  const drizzleDb = getDb();
  if (drizzleDb) {
    await drizzleDb.delete(schema.giftCodes).where(eq(schema.giftCodes.code, code.trim().toUpperCase()));
  }
}


export async function redeemGiftCode(phone: string, code: string) {
  const drizzleDb = getDb();
  if (drizzleDb) {
    const cleanCode = code.trim().toUpperCase();
    const gifts = await drizzleDb.select().from(schema.giftCodes).where(eq(schema.giftCodes.code, cleanCode));
    if (gifts.length === 0) throw new Error("Invalid or expired gift code.");
    const gift = gifts[0];
    const userRows = await drizzleDb.select().from(schema.users).where(eq(schema.users.phone, phone));
    if (userRows.length === 0) throw new Error("User not found");
    const user = userRows[0];
    const redeemed = (user.redeemedGiftCodes as string[]) || [];
    if (redeemed.includes(cleanCode)) throw new Error("You have already redeemed this code.");
    
    redeemed.push(cleanCode);
    const newPoints = (user.points || 0) + gift.amount;
    await drizzleDb.update(schema.users).set({ points: newPoints, redeemedGiftCodes: redeemed }).where(eq(schema.users.phone, phone));

    const newTxId = "tx_" + Date.now();
    await drizzleDb.insert(schema.transactions).values({
      id: newTxId,
      userId: phone,
      type: "voucher",
      amount: gift.amount,
      status: "completed",
      mode: "auto",
      timestamp: new Date().toISOString()
    });
    return { amount: gift.amount };
  }
  throw new Error("DB not connected");
}


export async function dailyCheckin(phone: string) {
  const user = await getUserProfile(phone);
  if (!user) throw new Error("User not found");

  const today = new Date().toISOString().split("T")[0];
  if (user.lastCheckinDate === today) {
    throw new Error("You have already checked in today.");
  }

  const config = await getSiteConfig();
  const base = (config.checkinBaseBonus !== undefined && config.checkinBaseBonus !== null) ? config.checkinBaseBonus : 1000;
  const inc = (config.checkinIncrement !== undefined && config.checkinIncrement !== null) ? config.checkinIncrement : 100;
  const currentStreak = (user.checkinStreak || 0) + 1;
  const bonus = base + ((currentStreak - 1) * inc);

  // Credit directly to withdrawable balance (points)!
  user.points = (user.points || 0) + bonus;
  user.lastCheckinDate = today;
  user.checkinStreak = currentStreak;
  await updateUserProfile(phone, { points: user.points, lastCheckinDate: today, checkinStreak: user.checkinStreak });

  // Record transaction in history
  await saveTransaction({
    id: "chk_" + crypto.randomBytes(8).toString("hex"),
    userId: phone,
    type: "checkin",
    amount: bonus,
    currency: "UGX",
    status: "SUCCESSFUL",
    paymentMethod: "CHECKIN",
    phone: phone,
    itemId: `day_${currentStreak}`,
    mode: "auto",
    timestamp: new Date().toISOString()
  });

  // Create notification alert
  await createNotification(
    phone,
    "Daily Check-in Reward",
    `You checked in successfully for Day ${currentStreak} and earned UGX ${bonus.toLocaleString()} credited to your withdrawable balance!`,
    "checkin"
  );

  return { amount: bonus, bonus, streak: user.checkinStreak };
}

export async function claimVipTask(phone: string, taskId: string, bonus: number = 5000) {
  const user = await getUserProfile(phone);
  if (!user) throw new Error("User not found");

  user.claimedVipTasks = user.claimedVipTasks || [];
  if (user.claimedVipTasks.includes(taskId)) {
    throw new Error("VIP task reward already claimed.");
  }

  // Credit directly to withdrawable balance (points)!
  user.points = (user.points || 0) + bonus;
  user.claimedVipTasks.push(taskId);
  await updateUserProfile(phone, { points: user.points, claimedVipTasks: user.claimedVipTasks });

  // Record transaction in history
  await saveTransaction({
    id: "vip_" + crypto.randomBytes(8).toString("hex"),
    userId: phone,
    type: "vip_task",
    amount: bonus,
    currency: "UGX",
    status: "SUCCESSFUL",
    paymentMethod: "VIP_TASK",
    phone: phone,
    itemId: taskId,
    mode: "auto",
    timestamp: new Date().toISOString()
  });

  // Create notification alert
  await createNotification(
    phone,
    "VIP Task Reward Claimed",
    `Successfully claimed VIP task reward of UGX ${bonus.toLocaleString()} credited to your withdrawable balance!`,
    "rewards"
  );

  return { bonus };
}

export async function adminUpdateUserLockStatus(phone: string, locked: boolean) {
  return await updateUserProfile(phone, { locked });
}

export async function adminCreateAnnouncement(title: string, message: string, readMoreLink?: string, category?: string, imageUrl?: string, tag?: string) {
  const anc = {
    id: "anc_" + crypto.randomBytes(6).toString("hex"),
    title,
    message,
    readMoreLink,
    category,
    imageUrl,
    tag,
    createdAt: new Date().toISOString()
  };
  const drizzleDb = getDb();
  if (drizzleDb) {
    await drizzleDb.insert(schema.announcements).values(anc);
  }
  return anc;
}


export async function adminUpdateAnnouncement(id: string, title: string, message: string, readMoreLink?: string, category?: string, imageUrl?: string, tag?: string) {
  const drizzleDb = getDb();
  if (drizzleDb) {
    await drizzleDb.update(schema.announcements).set({ title, message, readMoreLink, category, imageUrl, tag }).where(eq(schema.announcements.id, id));
  }
}

export async function adminGetAnnouncements() {
  const drizzleDb = getDb();
  if (drizzleDb) {
    return drizzleDb.select().from(schema.announcements).orderBy(desc(schema.announcements.createdAt));
  }
  return [];
}

export async function adminDeleteAnnouncement(id: string) {
  const drizzleDb = getDb();
  if (drizzleDb) {
    await drizzleDb.delete(schema.announcements).where(eq(schema.announcements.id, id));
  }
}

export async function adminGetChatConversations() {
  const drizzleDb = getDb();
  if (drizzleDb) {
    const rows = await drizzleDb.select().from(schema.chatMessages);
    const directMsgs = rows.filter(m => m.roomId && m.roomId.startsWith("direct_"));
    const convoMap = new Map<string, { roomId: string; userPhone: string; userName: string; lastMessage: string; lastTimestamp: string }>();

    for (const msg of directMsgs) {
      const userPhone = msg.roomId.replace("direct_", "");
      const existing = convoMap.get(msg.roomId);
      if (!existing || new Date(msg.timestamp).getTime() > new Date(existing.lastTimestamp).getTime()) {
        convoMap.set(msg.roomId, {
          roomId: msg.roomId,
          userPhone,
          userName: msg.senderName || userPhone,
          lastMessage: msg.text || (msg.image ? "[Attachment Image]" : ""),
          lastTimestamp: msg.timestamp
        });
      }
    }
    return Array.from(convoMap.values()).sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }
  return [];
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const drizzleDb = requireDatabase("load site configuration");
  try {
    const rows = await drizzleDb.select().from(schema.siteConfig).where(eq(schema.siteConfig.id, "main")).limit(1);
    if (rows.length > 0 && rows[0].configJson) return rows[0].configJson as SiteConfig;
    return {};
  } catch (err) {
    throw databaseFailure("load site configuration", err);
  }
}

export async function updateSiteConfig(newConfig: Partial<SiteConfig>): Promise<SiteConfig> {
  const drizzleDb = requireDatabase("save site configuration");
  try {
    const current = await getSiteConfig().catch(() => ({}));
    const updated = { ...current, ...newConfig };
    await drizzleDb.insert(schema.siteConfig).values({ id: "main", configJson: updated }).onDuplicateKeyUpdate({ set: { configJson: updated } });
    return updated as SiteConfig;
  } catch (err) {
    throw databaseFailure("save site configuration", err);
  }
}
