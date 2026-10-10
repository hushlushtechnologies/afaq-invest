#!/usr/bin/env node
/**
 * Writes the audit viewer's wording into both message files.
 *
 * Why a script rather than an edited file: `apps/admin/messages/en.json` and
 * `ar.json` are a thousand lines each, and this change touches about seventy
 * keys in four places in both of them. Hand-merging that is where a missing
 * Arabic label comes from. This holds the four blocks whole, writes them into
 * both files, and then checks the two files still have identical key sets.
 *
 * Idempotent: run it twice and the second run reports no change. Everything
 * outside `audit.actions`, `audit.detail`, `audit.fields` and `audit.metadata`
 * is left exactly as it was — the files round-trip byte-for-byte through
 * JSON.parse/stringify, so the diff is only what is below.
 *
 *   Run from the repository root:  node scripts/write-audit-action-labels.mjs
 */

import console from 'node:console';
import process from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = join(ROOT, 'apps', 'admin', 'messages');

/* -------------------------------------------------------------------------- */
/* English                                                                    */
/* -------------------------------------------------------------------------- */

const EN = {
  /**
   * One line per event the API can record, in the words somebody who does not
   * work on the software would use. Keyed `area.event`, matching the catalogue
   * in `@afaq/types`; `apps/api/src/audit/audit-actions.spec.ts` fails if the
   * two ever disagree.
   */
  actions: {
    company: {
      created: 'Company added',
      updated: 'Company details changed',
      activated: 'Company activated',
      deactivated: 'Company deactivated',
      suspended: 'Company suspended',
      verification_changed: 'Verification changed',
      featured: 'Featured on the marketplace',
      unfeatured: 'Removed from featured',
      reordered: 'Marketplace order changed',
    },
    investment_rule: {
      settings_changed: 'Investment settings changed',
      step_up_disabled: 'Password confirmation switched off',
      step_up_disable_refused: 'Refused: switching off password confirmation',
      draft_created: 'Rule set drafted',
      draft_updated: 'Draft details changed',
      ladder_replaced: 'Tiers rewritten',
      published: 'Rule set published',
      publish_refused: 'Refused: publishing a rule set',
      archived: 'Rule set archived',
      draft_deleted: 'Draft deleted',
    },
    role: {
      created: 'Role created',
      updated: 'Role changed',
      deleted: 'Role deleted',
    },
    staff: {
      invited: 'Staff member invited',
      invitation_accepted: 'Invitation accepted',
      invitation_resent: 'Invitation sent again',
      details_changed: 'Details changed',
      roles_changed: 'Roles changed',
      email_changed: 'Email address changed',
      password_reset_by_admin: 'Password reset by an administrator',
      roles_transferred: 'Roles transferred from another account',
      suspended: 'Access suspended',
      disabled: 'Account closed',
      active: 'Account reactivated',
      super_admin_bootstrapped: 'First Super Admin created',
    },
  },

  detail: {
    close: 'Close',
    actor: 'Made by',
    target: 'Record',
    category: 'Area',
    ipAddress: 'IP address',
    changes: 'What changed',
    field: 'Field',
    before: 'Before',
    after: 'After',
    metadata: 'Extra detail',

    // --- the ladder, when the entry carries one
    ladder: 'Investment tiers',
    ladderAsRecorded: 'The tiers as recorded at the time.',
    ladderReplaced: 'Replaced tiers',
    tierAdded: 'Added',
    tierRemoved: 'Removed',
    tierChanged: 'Changed',
    range: '{from} – {to}',
    fromUpwards: '{from} and above',
    term: '{min}–{max} months',
    termOpen: '{min} months or more',
    termNone: 'No fixed term',
    notice: '{days} days notice',
    noNotice: 'No notice period',
    itemCount: '{count} items',
    perYear: '{percent}% a year',
    periodUnknown: 'period not recorded',
    noOptions: 'No options recorded',

    // --- raw fallback
    showRaw: 'Show what was recorded',
    hideRaw: 'Hide what was recorded',
    rawNote: 'The entry exactly as stored, for when the summary above is not enough.',
    unknownAction: 'This version of the admin portal has no wording for this event yet.',
  },

  /**
   * Field names as they appear in a before/after row. Anything not listed
   * falls back to the stored key, which is ugly but never wrong — this list
   * covers the fields the API actually writes today.
   */
  fields: {
    status: 'Status',
    name: 'Name',
    slug: 'Web address',
    type: 'Type',
    sector: 'Sector',
    verification: 'Verification',
    isFeatured: 'Featured',
    order: 'Display order',
    version: 'Version',
    scope: 'Applies to',
    companyId: 'Company',
    roiBasis: 'Rate period',
    tierCount: 'Number of tiers',
    tiers: 'Tiers',
    notes: 'Notes',
    replaced: 'Replaced',
    currency: 'Currency',
    minimumInvestment: 'Minimum investment',
    maxRoiPercent: 'Maximum rate',
    maxRoiBasis: 'Maximum rate period',
    defaultNoticePeriodDays: 'Default notice period',
    requireStepUpToPublish: 'Password confirmation to publish',
    key: 'Key',
    permissions: 'Permissions',
    roles: 'Roles',
    fullName: 'Full name',
    jobTitle: 'Job title',
    preferredLocale: 'Language',
    email: 'Email address',
    from: 'Taken from',
    hadRoles: 'Roles held',
    addedRoles: 'Roles added',
    removedFromSource: 'Removed from the other account',
    method: 'Method',
    invitationExpiresAt: 'Invitation expires',
    nothing: 'Nothing',
  },

  /**
   * The "extra detail" block, in words. Keys are the metadata fields the API
   * writes; `values` holds the fixed strings some of them carry, because
   * "own_password" is not an answer to show anybody.
   */
  metadata: {
    reason: 'Reason given',
    stepUp: 'Password confirmation',
    scope: 'Applies to',
    copiedFrom: 'Copied from',
    replacedId: 'Replaced rule set',
    leavesNothingLive: 'Leaves no live rules',
    slugUnchanged: 'Web address kept as',
    affectedStaff: 'Staff affected',
    method: 'Method',
    source: 'Source',
    values: {
      own_password: 'The administrator re-entered their own password',
      not_required: 'Not required by the settings at the time',
      step_up_failed: 'The password was not accepted',
      temporary_password: 'A temporary password was issued',
      invitation: 'By invitation',
      password: 'With a password set directly',
      'bootstrap-cli': 'The first-administrator command',
    },
    yes: 'Yes',
    no: 'No',
  },
};

/* -------------------------------------------------------------------------- */
/* Arabic                                                                     */
/* -------------------------------------------------------------------------- */

const AR = {
  actions: {
    company: {
      created: 'تمت إضافة شركة',
      updated: 'تم تعديل بيانات الشركة',
      activated: 'تم تنشيط الشركة',
      deactivated: 'تم إيقاف الشركة',
      suspended: 'تم تعليق الشركة',
      verification_changed: 'تم تغيير حالة التحقق',
      featured: 'تم تمييز الشركة في السوق',
      unfeatured: 'تم إلغاء تمييز الشركة',
      reordered: 'تم تغيير ترتيب السوق',
    },
    investment_rule: {
      settings_changed: 'تم تعديل إعدادات الاستثمار',
      step_up_disabled: 'تم إيقاف تأكيد كلمة المرور',
      step_up_disable_refused: 'مرفوض: إيقاف تأكيد كلمة المرور',
      draft_created: 'تم إنشاء مسودة مجموعة قواعد',
      draft_updated: 'تم تعديل بيانات المسودة',
      ladder_replaced: 'تم إعادة كتابة الشرائح',
      published: 'تم نشر مجموعة القواعد',
      publish_refused: 'مرفوض: نشر مجموعة القواعد',
      archived: 'تم أرشفة مجموعة القواعد',
      draft_deleted: 'تم حذف المسودة',
    },
    role: {
      created: 'تم إنشاء دور',
      updated: 'تم تعديل دور',
      deleted: 'تم حذف دور',
    },
    staff: {
      invited: 'تمت دعوة موظف',
      invitation_accepted: 'تم قبول الدعوة',
      invitation_resent: 'تمت إعادة إرسال الدعوة',
      details_changed: 'تم تعديل البيانات',
      roles_changed: 'تم تغيير الأدوار',
      email_changed: 'تم تغيير البريد الإلكتروني',
      password_reset_by_admin: 'تمت إعادة تعيين كلمة المرور بواسطة مسؤول',
      roles_transferred: 'تم نقل الأدوار من حساب آخر',
      suspended: 'تم إيقاف الوصول',
      disabled: 'تم إغلاق الحساب',
      active: 'تمت إعادة تفعيل الحساب',
      super_admin_bootstrapped: 'تم إنشاء أول مسؤول أعلى',
    },
  },

  detail: {
    close: 'إغلاق',
    actor: 'نفّذه',
    target: 'السجل',
    category: 'المجال',
    ipAddress: 'عنوان IP',
    changes: 'ما تغيّر',
    field: 'الحقل',
    before: 'قبل',
    after: 'بعد',
    metadata: 'تفاصيل إضافية',

    ladder: 'شرائح الاستثمار',
    ladderAsRecorded: 'الشرائح كما تم تسجيلها في ذلك الوقت.',
    ladderReplaced: 'الشرائح السابقة',
    tierAdded: 'مضافة',
    tierRemoved: 'محذوفة',
    tierChanged: 'معدّلة',
    range: '{from} – {to}',
    fromUpwards: '{from} وأكثر',
    term: '{min}–{max} شهرًا',
    termOpen: '{min} شهرًا أو أكثر',
    termNone: 'بدون مدة محددة',
    notice: 'إشعار {days} يومًا',
    noNotice: 'بدون مدة إشعار',
    itemCount: '{count} عنصرًا',
    perYear: '{percent}% سنويًا',
    periodUnknown: 'الفترة غير مسجلة',
    noOptions: 'لا توجد خيارات مسجلة',

    showRaw: 'عرض ما تم تسجيله',
    hideRaw: 'إخفاء ما تم تسجيله',
    rawNote: 'السجل كما هو مخزَّن، لحين عدم كفاية الملخص أعلاه.',
    unknownAction: 'لا يوجد وصف لهذا الحدث في هذه النسخة من بوابة الإدارة بعد.',
  },

  fields: {
    status: 'الحالة',
    name: 'الاسم',
    slug: 'العنوان الإلكتروني',
    type: 'النوع',
    sector: 'القطاع',
    verification: 'التحقق',
    isFeatured: 'مميزة',
    order: 'ترتيب العرض',
    version: 'الإصدار',
    scope: 'النطاق',
    companyId: 'الشركة',
    roiBasis: 'فترة النسبة',
    tierCount: 'عدد الشرائح',
    tiers: 'الشرائح',
    notes: 'ملاحظات',
    replaced: 'استبدلت',
    currency: 'العملة',
    minimumInvestment: 'الحد الأدنى للاستثمار',
    maxRoiPercent: 'الحد الأقصى للنسبة',
    maxRoiBasis: 'فترة الحد الأقصى',
    defaultNoticePeriodDays: 'مدة الإشعار الافتراضية',
    requireStepUpToPublish: 'تأكيد كلمة المرور للنشر',
    key: 'المُعرّف',
    permissions: 'الصلاحيات',
    roles: 'الأدوار',
    fullName: 'الاسم الكامل',
    jobTitle: 'المسمى الوظيفي',
    preferredLocale: 'اللغة',
    email: 'البريد الإلكتروني',
    from: 'منقولة من',
    hadRoles: 'الأدوار المملوكة',
    addedRoles: 'الأدوار المضافة',
    removedFromSource: 'أزيلت من الحساب الآخر',
    method: 'الطريقة',
    invitationExpiresAt: 'انتهاء صلاحية الدعوة',
    nothing: 'لا شيء',
  },

  metadata: {
    reason: 'السبب المذكور',
    stepUp: 'تأكيد كلمة المرور',
    scope: 'النطاق',
    copiedFrom: 'منسوخة من',
    replacedId: 'مجموعة القواعد المستبدلة',
    leavesNothingLive: 'لا تترك قواعد سارية',
    slugUnchanged: 'العنوان الإلكتروني كما هو',
    affectedStaff: 'الموظفون المتأثرون',
    method: 'الطريقة',
    source: 'المصدر',
    values: {
      own_password: 'أعاد المسؤول إدخال كلمة المرور الخاصة به',
      not_required: 'غير مطلوب حسب الإعدادات في ذلك الوقت',
      step_up_failed: 'لم تُقبل كلمة المرور',
      temporary_password: 'تم إصدار كلمة مرور مؤقتة',
      invitation: 'عن طريق دعوة',
      password: 'بكلمة مرور محددة مباشرة',
      'bootstrap-cli': 'أمر إنشاء أول مسؤول',
    },
    yes: 'نعم',
    no: 'لا',
  },
};

/* -------------------------------------------------------------------------- */

const BLOCKS = ['actions', 'detail', 'fields', 'metadata'];

/** Every leaf path in an object, so the two files can be compared key by key. */
function leaves(value, prefix = '') {
  if (value === null || typeof value !== 'object') return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

function apply(locale, replacement) {
  const path = join(MESSAGES, `${locale}.json`);
  const original = readFileSync(path, 'utf8');
  const messages = JSON.parse(original);

  if (!messages.audit) {
    throw new Error(`${locale}.json has no "audit" section — wrong file or wrong directory?`);
  }

  const beforeLeaves = new Set(leaves(messages.audit, 'audit'));

  for (const block of BLOCKS) messages.audit[block] = replacement[block];

  const afterLeaves = new Set(leaves(messages.audit, 'audit'));

  const written = `${JSON.stringify(messages, null, 2)}\n`;
  const changed = written !== original;

  const added = [...afterLeaves].filter((key) => !beforeLeaves.has(key));

  const removed = [...beforeLeaves].filter((key) => !afterLeaves.has(key));

  if (removed.length > 0) {
    throw new Error(`${locale}.json: Update would remove existing keys:\n` + removed.join('\n'));
  }

  if (changed) {
    writeFileSync(path, written, 'utf8');
  }

  console.log(
    `${locale}.json: ${changed ? 'written' : 'already up to date'} — ` +
      `+${added.length} keys, -${removed.length} keys, ${afterLeaves.size} under audit`,
  );

  for (const key of removed) console.log(`  removed ${key}`);

  return leaves(messages, '');
}

const enLeaves = apply('en', EN);
const arLeaves = apply('ar', AR);

/**
 * The files must carry the same keys or half the product falls back to a
 * dotted key. Checked here as well as in the API test, so a mistake shows up
 * the moment the script runs rather than at the next build.
 */
const onlyEn = enLeaves.filter((key) => !arLeaves.includes(key));
const onlyAr = arLeaves.filter((key) => !enLeaves.includes(key));

if (onlyEn.length > 0 || onlyAr.length > 0) {
  console.error('\nThe two message files no longer match:');
  for (const key of onlyEn) console.error(`  only in en: ${key}`);
  for (const key of onlyAr) console.error(`  only in ar: ${key}`);
  process.exit(1);
}

console.log(`\nBoth files carry the same ${enLeaves.length} keys.`);
