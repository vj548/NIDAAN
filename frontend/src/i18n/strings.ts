// i18n strings for EN / हिन्दी
export type Lang = 'en' | 'hi'

export const t: Record<string, Record<Lang, string>> = {
  // Product
  productName:        { en: 'CaseConnect AI', hi: 'केसकनेक्ट एआई' },
  productTagline:     { en: 'Integrated institutional complaint and case management', hi: 'एकीकृत संस्थागत शिकायत और मामला प्रबंधन' },
  org1:               { en: 'All India Council for Technical Education', hi: 'अखिल भारतीय तकनीकी शिक्षा परिषद' },
  org2:               { en: 'Ministry of Education, Government of India', hi: 'शिक्षा मंत्रालय, भारत सरकार' },
  prototypeNotice:    { en: 'Prototype for SIH26264 · demo data', hi: 'SIH26264 का प्रोटोटाइप · डेमो डेटा' },
  // Nav
  navDashboard:       { en: 'Dashboard', hi: 'डैशबोर्ड' },
  navComplaints:      { en: 'Complaints', hi: 'शिकायतें' },
  navInstitutions:    { en: 'Institutions', hi: 'संस्थाएँ' },
  navTriage:          { en: 'Smart Triage', hi: 'स्मार्ट ट्राइएज' },
  navBureaus:         { en: 'Bureau Coordination', hi: 'ब्यूरो समन्वय' },
  navAudit:           { en: 'Audit Ledger', hi: 'ऑडिट खाता' },
  navAdmin:           { en: 'Rules & SLAs', hi: 'नियम और SLA' },
  navAnalytics:       { en: 'Analytics', hi: 'विश्लेषण' },
  navHelp:            { en: 'Help', hi: 'सहायता' },
  // Actions
  login:              { en: 'Login', hi: 'लॉगिन' },
  logout:             { en: 'Logout', hi: 'लॉगआउट' },
  reset:              { en: 'Reset', hi: 'रीसेट' },
  search:             { en: 'Search', hi: 'खोज' },
  view:               { en: 'View', hi: 'देखें' },
  assign:             { en: 'Assign', hi: 'असाइन करें' },
  resolve:            { en: 'Resolve', hi: 'हल करें' },
  confirm:            { en: 'Confirm', hi: 'पुष्टि करें' },
  dismiss:            { en: 'Dismiss', hi: 'खारिज करें' },
  cancel:             { en: 'Cancel', hi: 'रद्द करें' },
  submit:             { en: 'Submit', hi: 'जमा करें' },
  // Status labels
  RECEIVED:           { en: '○ RECEIVED', hi: '○ प्राप्त' },
  TRIAGE_PENDING:     { en: '○ TRIAGE PENDING', hi: '○ ट्राइएज लंबित' },
  UNDER_REVIEW:       { en: '◆ UNDER REVIEW', hi: '◆ समीक्षाधीन' },
  CROSS_BUREAU_REVIEW:{ en: '◆ CROSS-BUREAU REVIEW', hi: '◆ क्रॉस-ब्यूरो समीक्षा' },
  ACTION_REQUIRED:    { en: '▲ ACTION REQUIRED', hi: '▲ कार्रवाई आवश्यक' },
  SLA_AT_RISK:        { en: '◔ SLA AT RISK', hi: '◔ SLA जोखिम में' },
  SLA_BREACHED:       { en: '▲ SLA BREACHED', hi: '▲ SLA उल्लंघन' },
  RESOLVED:           { en: '● RESOLVED', hi: '● हल किया' },
  CLOSED:             { en: '● CLOSED', hi: '● बंद' },
  ON_HOLD:            { en: '⊘ ON HOLD', hi: '⊘ प्रतीक्षारत' },
  REOPENED:           { en: '○ REOPENED', hi: '○ पुनः खोला' },
  // Priority
  CRITICAL:           { en: 'CRITICAL', hi: 'अति गंभीर' },
  HIGH:               { en: 'HIGH', hi: 'उच्च' },
  MEDIUM:             { en: 'MEDIUM', hi: 'मध्यम' },
  LOW:                { en: 'LOW', hi: 'निम्न' },
  // Footer
  footerTerms:        { en: 'Terms', hi: 'शर्तें' },
  footerPrivacy:      { en: 'Privacy', hi: 'गोपनीयता' },
  footerAccess:       { en: 'Accessibility', hi: 'पहुँच-योग्यता' },
  footerHelp:         { en: 'Help & Feedback', hi: 'सहायता और प्रतिक्रिया' },
  footerOwner:        { en: 'Content owned by AICTE (Prototype — not official)', hi: 'सामग्री AICTE की है (प्रोटोटाइप — आधिकारिक नहीं)' },
  footerWIM:          { en: 'Website Information Manager: [Placeholder]', hi: 'वेबसाइट सूचना प्रबंधक: [प्लेसहोल्डर]' },
  // Breadcrumb
  home:               { en: 'Home', hi: 'होम' },
  // Help
  skipToMain:         { en: 'Skip to main content', hi: 'मुख्य सामग्री पर जाएँ' },
}

export function tr(key: string, lang: Lang): string {
  return t[key]?.[lang] ?? t[key]?.en ?? key
}
