#!/usr/bin/env node
/**
 * Writes the opportunity screens' wording into both message files.
 *
 * The same approach as write-audit-action-labels.mjs: the blocks are held
 * whole here, written into en.json and ar.json, and the two files are then
 * checked to carry identical key sets — so a missing Arabic label is caught
 * the moment this runs, not by somebody reading the page.
 *
 * Owns, and replaces whole:
 *   opportunities                          (the new section)
 *   moduleTabs.investments                 (the tab strip)
 *   moduleTabs.investmentsDescription
 *   companies.detail.opportunities         (the panel on a company's page)
 *
 * Everything else is left exactly as it was. Idempotent: a second run reports
 * no change.
 *
 *   Run from the repository root:  node scripts/write-opportunity-labels.mjs
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
  opportunities: {
    title: 'Opportunities',
    featured: 'Featured',
    searchPlaceholder: 'Search by title or company',
    loadError: 'The opportunities could not be loaded.',

    status: {
      DRAFT: 'Draft',
      OPEN: 'Open',
      SUSPENDED: 'Suspended',
      FULLY_FUNDED: 'Fully funded',
      CLOSED: 'Closed',
      CANCELLED: 'Cancelled',
    },

    columns: {
      title: 'Opportunity',
      company: 'Company',
      status: 'Status',
      funding: 'Funding',
      closes: 'Closes',
      updated: 'Updated',
    },

    filters: {
      status: 'Status',
      allStatuses: 'All statuses',
      companyType: 'Company',
      allCompanyTypes: 'All companies',
      liveOnly: 'Running only',
      yes: 'Yes',
    },

    empty: {
      title: 'No opportunities yet',
      description:
        'Draft the first one with "New opportunity". Nothing reaches investors until it is opened.',
    },

    funding: {
      label: 'Funded',
      percent: '{percent, number}%',
      amounts: '{committed} of {target}',
    },

    closing: {
      openEnded: 'No closing date',
      passed: 'Closing date passed',
      daysLeft: '{count, plural, one {1 day left} other {# days left}}',
    },

    summary: {
      loadError: 'The totals could not be loaded.',
      open: 'Open now',
      ofTotal: '{total, plural, one {Out of 1 opportunity} other {Out of # opportunities}}',
      committed: 'Committed to open raises',
      ofTarget: 'Of {target} being raised',
      draft: 'Drafts',
      draftHelp: 'Not yet visible to investors',
      fullyFunded: 'Fully funded',
      fullyFundedHelp: 'Reached their target and stopped taking money',
    },

    create: {
      action: 'New opportunity',
      title: 'New opportunity',
      description: 'Drafts a raise. You can review it before anybody can invest.',
      submit: 'Create draft',
      draftNote:
        'This creates a draft only. Investors see it once someone with approval rights opens it, and the investment terms are fixed at that moment from the company’s live rule set.',
      company: 'Company',
      chooseCompany: 'Choose a company',
      companyHelp: 'The company that receives the money.',
      companyNotAccepting:
        '{name} cannot receive investment at the moment. You can prepare the draft now, but it cannot be opened until that changes.',
      titleLabel: 'Title',
      titlePlaceholder: 'e.g. Marina residences — phase two',
      titleHelp: 'What investors see first. The web address is made from it once and then kept.',
      titleTooShort: 'The title needs at least two characters.',
      summary: 'Summary',
      summaryPlaceholder: 'One sentence on what the money is for',
      summaryHelp: 'Shown under the title on cards and lists.',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'The full story: what is being funded, how and over what period.',
      target: 'Target amount',
      targetHelp:
        'The raise stops taking money when this is reached. It can be raised later, but not lowered once the raise is open.',
      closesOn: 'Closing date',
      closesOnHelp:
        'Optional. The raise closes at the end of this day, UAE time. Leave it empty to keep it open until it is full or closed by hand.',
      featured: 'Feature on the marketplace',
      featuredHelp: 'Featured raises are shown ahead of the others from the same group.',
    },

    /**
     * One sentence per OPPORTUNITY_ISSUE_CODE. Every value placed here is an
     * amount of money, already formatted in the reader's currency and locale.
     * apps/api/src/opportunities/opportunity-issue-messages.spec.ts fails if a
     * code has no sentence or a sentence asks for a value the issue lacks.
     */
    issues: {
      no_title: 'Give the opportunity a title.',
      no_company: 'Choose the company that is raising.',
      target_not_positive: 'The target must be more than zero.',
      target_below_minimum:
        'The target is below the minimum single investment of {minimum}, so nobody could fill it.',
      target_lowered:
        'The target of an open raise can be increased but not lowered (from {from} to {to}).',
      target_below_committed: 'The target is below the {committed} already committed.',
      close_before_open: 'The closing date must be after the opening date.',
      close_in_past: 'The closing date has already passed. Move it forward or clear it.',
      no_live_ladder:
        'No rule set is published for this company or for the platform, so there are no terms to fix.',
      company_not_accepting:
        'This company cannot receive investment right now — it is inactive, suspended or not yet verified.',
    },

    detail: {
      missing: {
        title: 'Opportunity not found',
        description: 'It may have been a draft that was deleted, or the link is wrong.',
      },
      loadError: {
        title: 'The opportunity could not be loaded',
        description: 'Something went wrong while fetching it. Please try again.',
      },
      backToList: 'Back to opportunities',
      about: 'About this opportunity',
      noDescription: 'No description yet.',
      createdBy: 'Drafted by {who} on {when}',
      openedBy: 'opened by {who} on {when}',
      endedAt: 'ended on {when}',
      someone: 'a former staff member',
      funding: 'Funding',
      target: 'Target',
      remaining: 'Still to raise',
      closes: 'Closes',
      hardCapNote: 'The raise stops taking money the moment the target is reached.',
      statusNote: {
        DRAFT: 'A draft. Investors cannot see it until it is opened.',
        OPEN: 'Open. Investors can see it and put money in.',
        SUSPENDED:
          'Suspended. Investors can still see it but cannot put money in until it is resumed.',
        FULLY_FUNDED: 'Fully funded. It reached its target and is no longer taking money.',
        CLOSED:
          'Closed. It no longer takes money; existing investments carry on under their terms.',
        CANCELLED: 'Cancelled. It no longer takes money and is kept for the record.',
      },
    },

    terms: {
      title: 'Investment terms',
      pinnedTo: 'Fixed to {name} v{version} when the raise opened',
      viewRuleSet: 'View rule set',
      minimum: 'Minimum investment',
      bestRate: 'Best rate on offer',
      bestRateValue:
        '{percent, number}% {basis, select, MONTHLY {a month} QUARTERLY {a quarter} ANNUAL {a year} other {}} · {mode, select, LOCKED {locked} UNLOCKED {unlocked} other {}}',
      noRulePermission:
        'You do not have access to view rule sets, so the full tier table is hidden.',
      loadError: 'The rule set could not be loaded.',
      previewDescription: 'Not fixed yet. These are the terms it would get if it opened now.',
      previewNote:
        'Preview: {name} v{version} is live for this company today. The terms are fixed at the moment the raise opens, so a rule set published before then would replace this one.',
      noLiveLadder:
        'No rule set is published for this company or for the platform, so this draft cannot be opened yet. Publish one under Investments → Rules.',
      neverOpened: 'This raise never opened, so no terms were ever fixed.',
    },

    actions: {
      open: 'Open to investors',
      resume: 'Resume',
      suspend: 'Suspend',
      close: 'Close',
      cancel: 'Cancel opportunity',
      edit: 'Edit details',
      deleteDraft: 'Delete draft',
    },

    edit: {
      title: 'Edit opportunity',
      description: 'Changes to “{title}” are saved together and recorded in the audit trail.',
      lockedNote:
        'This raise has opened, so its terms are fixed: the company cannot change and the target can only go up. The wording, closing date and featured setting can still be changed.',
      companyLocked: 'Fixed once the raise opened.',
      titleHelp:
        'Investors see the new title straight away. The web address stays the same, so shared links keep working.',
      targetLocked: 'Can be increased, but not lowered below the current {current}.',
      closesOnLive:
        'The raise closes at the end of this day, UAE time. It cannot be set to a day that has passed — use Close for that, so the closing is recorded.',
    },

    moves: {
      checking: 'Checking that it is ready…',
      blocked: 'This cannot go ahead yet:',
      final: 'This is final. It cannot be undone, and the raise cannot be reopened.',
      reasonLabel: 'Reason',
      reasonHelp:
        'Required. Recorded in the audit trail. At least {min, plural, one {# character} other {# characters}}.',
      noteLabel: 'Note',
      noteHelp: 'Optional. Recorded in the audit trail.',
      open: {
        title: 'Open “{title}” to investors?',
        description: 'Investors will be able to see it and put money in.',
        consequence:
          'Opening fixes the investment terms to the rule set that is live at this moment. Later changes to the rules will not affect this raise.',
        pins: 'Terms will be fixed to {name} v{version}.',
        confirm: 'Open now',
      },
      resume: {
        title: 'Resume “{title}”?',
        description: 'Investors will be able to put money in again.',
        consequence: 'It resumes on the terms fixed when it first opened. Nothing is re-priced.',
        confirm: 'Resume',
      },
      suspend: {
        title: 'Suspend “{title}”?',
        description: 'Investors will still see it, but cannot put money in.',
        consequence:
          'Existing investments are not affected. You can resume it later on the same terms.',
        confirm: 'Suspend',
      },
      close: {
        title: 'Close “{title}”?',
        description: 'It will stop taking money for good.',
        consequence:
          'Existing investments carry on under their terms. A raise that needs to run again has to be created as a new opportunity.',
        confirm: 'Close opportunity',
      },
      cancel: {
        title: 'Cancel “{title}”?',
        description: 'It will be withdrawn and kept for the record.',
        consequence:
          'Use this when the raise should not go ahead. Investors can no longer put money in, and the cancellation and its reason are recorded.',
        confirm: 'Cancel opportunity',
      },
    },

    delete: {
      title: 'Delete this draft?',
      message:
        '“{title}” has never been opened, so it can be removed entirely. This cannot be undone.',
      confirm: 'Delete draft',
      keep: 'Keep it',
    },

    /**
     * One sentence per refusal reason the opportunities API can give.
     * apps/api/src/opportunities/opportunity-issue-messages.spec.ts reads the
     * API source and fails if a reason it throws is missing here.
     */
    errors: {
      changed_meanwhile:
        'Somebody else changed this opportunity a moment ago. The page now shows the latest version — check it and try again.',
      company_locked: 'The company cannot be changed once the raise has opened.',
      finished: 'This opportunity is closed or cancelled, so it can no longer be changed.',
      invalid_opportunity: 'The opportunity was refused:',
      invalid_title:
        'A web address cannot be made from that title. Use a title with some letters or numbers.',
      invalid_transition:
        'That is not possible in the opportunity’s current state. The page now shows its latest status.',
      no_change: 'Nothing changed — it is already like that.',
      no_live_ladder:
        'No rule set is published for this company or for the platform, so there are no terms to fix. Publish one under Investments → Rules first.',
      not_a_draft:
        'Only drafts can be deleted. An opportunity that has opened can be cancelled instead.',
      not_found: 'This opportunity no longer exists. It may have been deleted.',
      not_seeded:
        'The platform’s investment settings have not been set up yet. Ask a system administrator to complete the setup.',
      slug_exhausted: 'Too many opportunities already use that title. Choose a more specific one.',
      slug_race:
        'Another opportunity with the same title was created at the same moment. Save again.',
      unknown_company: 'That company no longer exists. Choose another one.',
      forbidden: 'You do not have permission to do that.',
      failed: 'Something went wrong. Please try again.',
    },
  },

  moduleTabs: {
    investmentsDescription: 'Raises, the tier rules behind them and their returns.',
    investments: {
      opportunities: 'Opportunities',
      rules: 'Rules',
    },
  },

  companyPanel: {
    title: 'Investment opportunities',
    description: 'Raises for this company, most recently changed first.',
    create: 'New opportunity',
    loadError: 'The opportunities could not be loaded.',
    empty: {
      title: 'No opportunities yet',
      description: 'Raises drafted for {name} will be listed here.',
      blocked:
        '{name} is not open for investment. A draft can be prepared, but it cannot be opened while that is the case.',
    },
    blockedNote:
      '{name} is not open for investment at the moment, so none of these can be opened or resumed.',
    more: '{count, plural, one {1 more.} other {# more.}}',
    viewAll: 'View all opportunities',
  },
};

/* -------------------------------------------------------------------------- */
/* Arabic                                                                     */
/* -------------------------------------------------------------------------- */

const AR = {
  opportunities: {
    title: 'الفرص الاستثمارية',
    featured: 'مميزة',
    searchPlaceholder: 'ابحث بالعنوان أو اسم الشركة',
    loadError: 'تعذر تحميل الفرص الاستثمارية.',

    status: {
      DRAFT: 'مسودة',
      OPEN: 'مفتوحة',
      SUSPENDED: 'موقوفة',
      FULLY_FUNDED: 'مكتملة التمويل',
      CLOSED: 'مغلقة',
      CANCELLED: 'ملغاة',
    },

    columns: {
      title: 'الفرصة',
      company: 'الشركة',
      status: 'الحالة',
      funding: 'التمويل',
      closes: 'الإغلاق',
      updated: 'آخر تحديث',
    },

    filters: {
      status: 'الحالة',
      allStatuses: 'كل الحالات',
      companyType: 'الشركة',
      allCompanyTypes: 'كل الشركات',
      liveOnly: 'الجارية فقط',
      yes: 'نعم',
    },

    empty: {
      title: 'لا توجد فرص بعد',
      description: 'أنشئ أول مسودة من «فرصة جديدة». لا يظهر شيء للمستثمرين قبل فتح الفرصة.',
    },

    funding: {
      label: 'نسبة التمويل',
      percent: '{percent, number}٪',
      amounts: '{committed} من {target}',
    },

    closing: {
      openEnded: 'بدون تاريخ إغلاق',
      passed: 'انقضى تاريخ الإغلاق',
      daysLeft:
        '{count, plural, zero {لم يتبقَّ أي يوم} one {يتبقى يوم واحد} two {يتبقى يومان} few {يتبقى # أيام} many {يتبقى # يومًا} other {يتبقى # يوم}}',
    },

    summary: {
      loadError: 'تعذر تحميل الإجماليات.',
      open: 'المفتوحة الآن',
      ofTotal:
        '{total, plural, zero {من أصل لا شيء} one {من أصل فرصة واحدة} two {من أصل فرصتين} few {من أصل # فرص} many {من أصل # فرصة} other {من أصل # فرصة}}',
      committed: 'الملتزم به في الفرص المفتوحة',
      ofTarget: 'من أصل {target} مطلوب جمعها',
      draft: 'المسودات',
      draftHelp: 'غير ظاهرة للمستثمرين بعد',
      fullyFunded: 'مكتملة التمويل',
      fullyFundedHelp: 'بلغت هدفها وتوقفت عن قبول الأموال',
    },

    create: {
      action: 'فرصة جديدة',
      title: 'فرصة جديدة',
      description: 'تُنشئ مسودة طرح يمكنك مراجعتها قبل أن يتمكن أي أحد من الاستثمار.',
      submit: 'إنشاء المسودة',
      draftNote:
        'ينشئ هذا مسودة فقط. يراها المستثمرون عندما يفتحها شخص يملك صلاحية الاعتماد، وتُثبَّت شروط الاستثمار في تلك اللحظة من مجموعة القواعد السارية للشركة.',
      company: 'الشركة',
      chooseCompany: 'اختر شركة',
      companyHelp: 'الشركة التي تتلقى الأموال.',
      companyNotAccepting:
        'لا تستطيع {name} تلقي استثمارات حاليًا. يمكنك تجهيز المسودة الآن، لكن لا يمكن فتحها حتى يتغير ذلك.',
      titleLabel: 'العنوان',
      titlePlaceholder: 'مثال: مساكن المارينا — المرحلة الثانية',
      titleHelp: 'أول ما يراه المستثمرون. يُنشأ منه عنوان الصفحة مرة واحدة ثم يبقى كما هو.',
      titleTooShort: 'يجب أن يتكون العنوان من حرفين على الأقل.',
      summary: 'الملخص',
      summaryPlaceholder: 'جملة واحدة عن الغرض من الأموال',
      summaryHelp: 'يظهر تحت العنوان في البطاقات والقوائم.',
      descriptionLabel: 'الوصف',
      descriptionPlaceholder: 'التفاصيل الكاملة: ما الذي يُموَّل، وكيف، وعلى أي مدة.',
      target: 'المبلغ المستهدف',
      targetHelp:
        'يتوقف الطرح عن قبول الأموال عند بلوغ هذا المبلغ. يمكن زيادته لاحقًا، لكن لا يمكن خفضه بعد فتح الطرح.',
      closesOn: 'تاريخ الإغلاق',
      closesOnHelp:
        'اختياري. يُغلق الطرح في نهاية هذا اليوم بتوقيت الإمارات. اتركه فارغًا ليبقى مفتوحًا حتى يكتمل أو يُغلق يدويًا.',
      featured: 'إبراز في سوق الاستثمار',
      featuredHelp: 'تظهر الفرص المميزة قبل غيرها ضمن المجموعة نفسها.',
    },

    issues: {
      no_title: 'أدخل عنوانًا للفرصة.',
      no_company: 'اختر الشركة التي تطرح الفرصة.',
      target_not_positive: 'يجب أن يكون المبلغ المستهدف أكبر من صفر.',
      target_below_minimum:
        'المبلغ المستهدف أقل من الحد الأدنى للاستثمار الواحد البالغ {minimum}، فلا يمكن لأحد استكماله.',
      target_lowered:
        'يمكن زيادة المبلغ المستهدف لطرح مفتوح لكن لا يمكن خفضه (من {from} إلى {to}).',
      target_below_committed: 'المبلغ المستهدف أقل من {committed} الملتزم به بالفعل.',
      close_before_open: 'يجب أن يكون تاريخ الإغلاق بعد تاريخ الفتح.',
      close_in_past: 'انقضى تاريخ الإغلاق بالفعل. اختر تاريخًا لاحقًا أو امسحه.',
      no_live_ladder:
        'لا توجد مجموعة قواعد منشورة لهذه الشركة أو للمنصة، فلا توجد شروط يمكن تثبيتها.',
      company_not_accepting:
        'لا تستطيع هذه الشركة تلقي استثمارات حاليًا — فهي غير نشطة أو موقوفة أو لم يُتحقق منها بعد.',
    },

    detail: {
      missing: {
        title: 'الفرصة غير موجودة',
        description: 'ربما كانت مسودة حُذفت، أو أن الرابط غير صحيح.',
      },
      loadError: {
        title: 'تعذر تحميل الفرصة',
        description: 'حدث خطأ أثناء جلبها. يرجى المحاولة مرة أخرى.',
      },
      backToList: 'العودة إلى الفرص',
      about: 'عن هذه الفرصة',
      noDescription: 'لا يوجد وصف بعد.',
      createdBy: 'أنشأ المسودة {who} في {when}',
      openedBy: 'وفتحها {who} في {when}',
      endedAt: 'وانتهت في {when}',
      someone: 'موظف سابق',
      funding: 'التمويل',
      target: 'المستهدف',
      remaining: 'المتبقي للجمع',
      closes: 'الإغلاق',
      hardCapNote: 'يتوقف الطرح عن قبول الأموال لحظة بلوغ المبلغ المستهدف.',
      statusNote: {
        DRAFT: 'مسودة. لا يستطيع المستثمرون رؤيتها قبل فتحها.',
        OPEN: 'مفتوحة. يستطيع المستثمرون رؤيتها والاستثمار فيها.',
        SUSPENDED: 'موقوفة. ما زال المستثمرون يرونها لكن لا يمكنهم الاستثمار فيها حتى تُستأنف.',
        FULLY_FUNDED: 'مكتملة التمويل. بلغت هدفها ولم تعد تقبل الأموال.',
        CLOSED: 'مغلقة. لم تعد تقبل الأموال، وتستمر الاستثمارات القائمة وفق شروطها.',
        CANCELLED: 'ملغاة. لم تعد تقبل الأموال، وتُحفظ للسجل.',
      },
    },

    terms: {
      title: 'شروط الاستثمار',
      pinnedTo: 'ثُبّتت على {name} الإصدار {version} عند فتح الطرح',
      viewRuleSet: 'عرض مجموعة القواعد',
      minimum: 'الحد الأدنى للاستثمار',
      bestRate: 'أفضل عائد معروض',
      bestRateValue:
        '{percent, number}٪ {basis, select, MONTHLY {شهريًا} QUARTERLY {كل ربع سنة} ANNUAL {سنويًا} other {}} · {mode, select, LOCKED {مقفل} UNLOCKED {غير مقفل} other {}}',
      noRulePermission: 'ليست لديك صلاحية عرض مجموعات القواعد، لذا أُخفي جدول الفئات الكامل.',
      loadError: 'تعذر تحميل مجموعة القواعد.',
      previewDescription: 'لم تُثبَّت بعد. هذه هي الشروط التي ستحصل عليها لو فُتحت الآن.',
      previewNote:
        'معاينة: {name} الإصدار {version} سارية لهذه الشركة اليوم. تُثبَّت الشروط لحظة فتح الطرح، فإن نُشرت مجموعة قواعد قبل ذلك فستحل محل هذه.',
      noLiveLadder:
        'لا توجد مجموعة قواعد منشورة لهذه الشركة أو للمنصة، لذا لا يمكن فتح هذه المسودة بعد. انشر واحدة من الاستثمارات ← القواعد.',
      neverOpened: 'لم يُفتح هذا الطرح قط، لذا لم تُثبَّت له أي شروط.',
    },

    actions: {
      open: 'فتح للمستثمرين',
      resume: 'استئناف',
      suspend: 'إيقاف',
      close: 'إغلاق',
      cancel: 'إلغاء الفرصة',
      edit: 'تعديل البيانات',
      deleteDraft: 'حذف المسودة',
    },

    edit: {
      title: 'تعديل الفرصة',
      description: 'تُحفظ التغييرات على «{title}» معًا وتُسجَّل في سجل التدقيق.',
      lockedNote:
        'فُتح هذا الطرح، لذا أصبحت شروطه ثابتة: لا يمكن تغيير الشركة، ويمكن زيادة المبلغ المستهدف فقط. ما زال بالإمكان تعديل النصوص وتاريخ الإغلاق وخيار الإبراز.',
      companyLocked: 'ثابتة منذ فتح الطرح.',
      titleHelp:
        'يرى المستثمرون العنوان الجديد فورًا. يبقى عنوان الصفحة كما هو، فتستمر الروابط المشتركة في العمل.',
      targetLocked: 'يمكن زيادته، لكن لا يمكن خفضه عن المبلغ الحالي {current}.',
      closesOnLive:
        'يُغلق الطرح في نهاية هذا اليوم بتوقيت الإمارات. لا يمكن اختيار يوم انقضى — استخدم «إغلاق» لذلك ليُسجَّل الإغلاق.',
    },

    moves: {
      checking: 'جارٍ التحقق من الجاهزية…',
      blocked: 'لا يمكن المتابعة بعد:',
      final: 'هذا الإجراء نهائي. لا يمكن التراجع عنه، ولا يمكن إعادة فتح الطرح.',
      reasonLabel: 'السبب',
      reasonHelp:
        'مطلوب. يُسجَّل في سجل التدقيق. {min, plural, zero {} one {حرف واحد على الأقل} two {حرفان على الأقل} few {# أحرف على الأقل} many {# حرفًا على الأقل} other {# حرف على الأقل}}.',
      noteLabel: 'ملاحظة',
      noteHelp: 'اختيارية. تُسجَّل في سجل التدقيق.',
      open: {
        title: 'فتح «{title}» للمستثمرين؟',
        description: 'سيتمكن المستثمرون من رؤيتها والاستثمار فيها.',
        consequence:
          'يثبّت الفتح شروط الاستثمار على مجموعة القواعد السارية في هذه اللحظة. لن تؤثر التغييرات اللاحقة على القواعد في هذا الطرح.',
        pins: 'ستُثبَّت الشروط على {name} الإصدار {version}.',
        confirm: 'افتح الآن',
      },
      resume: {
        title: 'استئناف «{title}»؟',
        description: 'سيتمكن المستثمرون من الاستثمار فيها مجددًا.',
        consequence: 'تُستأنف وفق الشروط التي ثُبّتت عند فتحها أول مرة. لا يُعاد تسعير أي شيء.',
        confirm: 'استئناف',
      },
      suspend: {
        title: 'إيقاف «{title}»؟',
        description: 'سيظل المستثمرون يرونها، لكن لا يمكنهم الاستثمار فيها.',
        consequence: 'لا تتأثر الاستثمارات القائمة. يمكنك استئنافها لاحقًا بالشروط نفسها.',
        confirm: 'إيقاف',
      },
      close: {
        title: 'إغلاق «{title}»؟',
        description: 'ستتوقف عن قبول الأموال نهائيًا.',
        consequence:
          'تستمر الاستثمارات القائمة وفق شروطها. إذا لزم تشغيل الطرح مجددًا فيجب إنشاؤه كفرصة جديدة.',
        confirm: 'إغلاق الفرصة',
      },
      cancel: {
        title: 'إلغاء «{title}»؟',
        description: 'ستُسحب وتُحفظ للسجل.',
        consequence:
          'استخدم هذا عندما لا ينبغي للطرح أن يمضي. لن يتمكن المستثمرون من الاستثمار فيه، ويُسجَّل الإلغاء وسببه.',
        confirm: 'إلغاء الفرصة',
      },
    },

    delete: {
      title: 'حذف هذه المسودة؟',
      message: 'لم تُفتح «{title}» قط، لذا يمكن حذفها بالكامل. لا يمكن التراجع عن ذلك.',
      confirm: 'حذف المسودة',
      keep: 'الإبقاء عليها',
    },

    errors: {
      changed_meanwhile:
        'غيّر شخص آخر هذه الفرصة قبل لحظات. تعرض الصفحة الآن أحدث نسخة — راجعها وحاول مرة أخرى.',
      company_locked: 'لا يمكن تغيير الشركة بعد فتح الطرح.',
      finished: 'هذه الفرصة مغلقة أو ملغاة، لذا لم يعد بالإمكان تغييرها.',
      invalid_opportunity: 'رُفضت الفرصة:',
      invalid_title:
        'لا يمكن إنشاء عنوان صفحة من هذا العنوان. استخدم عنوانًا يحتوي على حروف أو أرقام.',
      invalid_transition: 'هذا غير ممكن في الحالة الحالية للفرصة. تعرض الصفحة الآن أحدث حالة لها.',
      no_change: 'لم يتغير شيء — الفرصة على هذه الحال بالفعل.',
      no_live_ladder:
        'لا توجد مجموعة قواعد منشورة لهذه الشركة أو للمنصة، فلا توجد شروط يمكن تثبيتها. انشر واحدة أولًا من الاستثمارات ← القواعد.',
      not_a_draft: 'يمكن حذف المسودات فقط. أما الفرصة التي فُتحت فيمكن إلغاؤها بدلًا من ذلك.',
      not_found: 'لم تعد هذه الفرصة موجودة. ربما حُذفت.',
      not_seeded: 'لم تُجهَّز إعدادات الاستثمار في المنصة بعد. اطلب من مسؤول النظام إكمال الإعداد.',
      slug_exhausted: 'هناك فرص كثيرة تستخدم هذا العنوان بالفعل. اختر عنوانًا أكثر تحديدًا.',
      slug_race: 'أُنشئت فرصة أخرى بالعنوان نفسه في اللحظة ذاتها. احفظ مرة أخرى.',
      unknown_company: 'لم تعد هذه الشركة موجودة. اختر شركة أخرى.',
      forbidden: 'ليست لديك صلاحية القيام بذلك.',
      failed: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    },
  },

  moduleTabs: {
    investmentsDescription: 'الطروحات وقواعد الفئات التي تحكمها وعوائدها.',
    investments: {
      opportunities: 'الفرص',
      rules: 'القواعد',
    },
  },

  companyPanel: {
    title: 'الفرص الاستثمارية',
    description: 'طروحات هذه الشركة، الأحدث تعديلًا أولًا.',
    create: 'فرصة جديدة',
    loadError: 'تعذر تحميل الفرص الاستثمارية.',
    empty: {
      title: 'لا توجد فرص بعد',
      description: 'ستظهر هنا الطروحات التي تُنشأ لـ{name}.',
      blocked: '{name} غير متاحة للاستثمار. يمكن تجهيز مسودة، لكن لا يمكن فتحها ما دام الأمر كذلك.',
    },
    blockedNote: '{name} غير متاحة للاستثمار حاليًا، لذا لا يمكن فتح أي من هذه أو استئنافه.',
    more: '{count, plural, zero {لا مزيد.} one {وفرصة أخرى.} two {وفرصتان أخريان.} few {و# فرص أخرى.} many {و# فرصة أخرى.} other {و# فرصة أخرى.}}',
    viewAll: 'عرض كل الفرص',
  },
};

/* -------------------------------------------------------------------------- */

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

  if (!messages.moduleTabs || !messages.companies?.detail) {
    throw new Error(`${locale}.json is missing moduleTabs or companies.detail — wrong file?`);
  }

  const before = new Set(leaves(messages, ''));

  messages.opportunities = replacement.opportunities;
  messages.moduleTabs.investmentsDescription = replacement.moduleTabs.investmentsDescription;
  messages.moduleTabs.investments = replacement.moduleTabs.investments;
  messages.companies.detail.opportunities = replacement.companyPanel;

  const after = leaves(messages, '');
  const written = `${JSON.stringify(messages, null, 2)}\n`;
  const changed = written !== original;

  if (changed) writeFileSync(path, written, 'utf8');

  const added = after.filter((key) => !before.has(key));
  const afterSet = new Set(after);
  const removed = [...before].filter((key) => !afterSet.has(key));

  console.log(
    `${locale}.json: ${changed ? 'written' : 'already up to date'} — ` +
      `+${added.length} keys, -${removed.length} keys`,
  );
  for (const key of removed) console.log(`  removed ${key}`);

  return after;
}

const enLeaves = apply('en', EN);
const arLeaves = apply('ar', AR);

const onlyEn = enLeaves.filter((key) => !arLeaves.includes(key));
const onlyAr = arLeaves.filter((key) => !enLeaves.includes(key));

if (onlyEn.length > 0 || onlyAr.length > 0) {
  console.error('\nThe two message files no longer match:');
  for (const key of onlyEn) console.error(`  only in en: ${key}`);
  for (const key of onlyAr) console.error(`  only in ar: ${key}`);
  process.exit(1);
}

console.log(`\nBoth files carry the same ${enLeaves.length} keys.`);
