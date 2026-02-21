/*
  Coffee-with-Cinema — Frontend
  Vanilla JS SPA-style UI over a single Flask template.

  Backend endpoints (Flask):
    POST /set_username
    POST /generate_content
    POST /download/<format_type>

  Notes:
  - No backend logic implemented here.
  - Uses Fetch API with robust error handling.
  - State is kept in a single appState object.
*/

const landingView = document.getElementById("landingView");
const dashboardView = document.getElementById("dashboardView");
const openUsernameModalBtn = document.getElementById("openUsernameModalBtn");
const closeUsernameModalBtn = document.getElementById("closeUsernameModalBtn");
const modalBackdrop = document.getElementById("modalBackdrop");
const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("usernameInput");
const continueBtn = document.getElementById("continueBtn");
const usernameError = document.getElementById("usernameError");

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

const navItems = document.querySelectorAll(".nav__item");
const pages = document.querySelectorAll(".page");

const storyInput = document.getElementById("storyInput");
const generateBtn = document.getElementById("generateBtn");
const generateSpinner = document.getElementById("generateSpinner");
const storyError = document.getElementById("storyError");

const screenplayOutput = document.getElementById("screenplayOutput");
const charactersOutput = document.getElementById("charactersOutput");
const soundOutput = document.getElementById("soundOutput");

const screenplayError = document.getElementById("screenplayError");
const charactersError = document.getElementById("charactersError");
const soundError = document.getElementById("soundError");

const globalStatus = document.getElementById("globalStatus");
const languageSelect = document.getElementById("languageSelect");
const themeToggle = document.getElementById("themeToggle");

const downloadButtons = document.querySelectorAll("[data-download]");
const downloadStatus = document.getElementById("downloadStatus");

let currentUser = "";
let lastPayload = null;

const I18N = {
  en: {
    hero_eyebrow: "CineVerse AI Studio",
    hero_title: "Direct Intelligence.",
    hero_subtitle: "A modern AI production suite for screenplay, characters, and sound design.",
    hero_cta_primary: "Enter the Studio",
    hero_cta_secondary: "View Demo",
    feature_scripts_title: "Studio-grade scripts",
    feature_scripts_desc: "WGA-aligned formatting with cinematic pacing.",
    feature_characters_title: "Character intelligence",
    feature_characters_desc: "Casting-ready profiles with arcs and motivation.",
    feature_sound_title: "Sound lab planning",
    feature_sound_desc: "Scene-based mixes with Foley and score notes.",
    modal_title: "Enter your username",
    modal_desc: "Your personalized production console awaits.",
    modal_username_label: "Username",
    modal_username_placeholder: "e.g., meera",
    modal_continue: "Enter Console",
    modal_fineprint: "By continuing, you start a new creative session.",
    brand_name: "CineVerse AI Studio",
    brand_tag: "Premium White Minimal SaaS",
    nav_storyline: "Storyline",
    nav_screenplay: "Screenplay",
    nav_characters: "Characters",
    nav_sound: "Sound Design",
    chip_console: "Studio Console",
    greeting: "Welcome. Let's create something cinematic.",
    topbar_sub: "Production console ready.",
    language: "Language",
    badge_studio: "Studio Mode",
    label_production: "Production Console",
    title_storyline: "Storyline",
    subtitle_storyline: "Describe your film idea with cinematic precision.",
    story_label: "Your story idea",
    story_placeholder: "A visionary director discovers a reel that edits reality with every cut...",
    generate_btn: "Generate Production Pack",
    label_script: "Script Workspace",
    title_screenplay: "Screenplay",
    subtitle_screenplay: "Professional formatting with cinematic spacing.",
    download_txt: "Download TXT",
    download_pdf: "Download PDF",
    download_docx: "Download DOCX",
    label_characters: "Character Intelligence",
    title_characters: "Character Profiles",
    subtitle_characters: "Casting-ready profiles with narrative arcs.",
    label_sound: "Sound Lab",
    title_sound: "Sound Design",
    subtitle_sound: "Timeline-focused mix plans for each scene.",
    status_analyzing: "Analyzing your story...",
    status_generating: "Generating screenplay and production notes...",
    status_complete: "Generation complete. Showing screenplay.",
    status_failed: "Generation failed. Please try again.",
    err_username_short: "Please enter at least 2 characters.",
    err_story_short: "Please provide at least 10 characters.",
    err_generation_failed: "Generation failed."
  },
  hi: {
    hero_eyebrow: "CineVerse AI Studio",
    hero_title: "प्रत्यक्ष बुद्धिमत्ता.",
    hero_subtitle: "स्क्रीनप्ले, पात्र और साउंड डिजाइन के लिए एक आधुनिक AI प्रोडक्शन सूट।",
    hero_cta_primary: "स्टूडियो में प्रवेश करें",
    hero_cta_secondary: "डेमो देखें",
    feature_scripts_title: "स्टूडियो-ग्रेड स्क्रिप्ट",
    feature_scripts_desc: "WGA-अनुरूप फॉर्मेटिंग और सिनेमैटिक गति।",
    feature_characters_title: "चरित्र इंटेलिजेंस",
    feature_characters_desc: "आर्क और प्रेरणा के साथ कास्टिंग-रेडी प्रोफाइल।",
    feature_sound_title: "साउंड लैब प्लानिंग",
    feature_sound_desc: "सीन-आधारित मिक्स, फोली और स्कोर नोट्स।",
    modal_title: "अपना उपयोगकर्ता नाम दर्ज करें",
    modal_desc: "आपका व्यक्तिगत प्रोडक्शन कंसोल तैयार है।",
    modal_username_label: "यूज़रनेम",
    modal_username_placeholder: "जैसे, मीरा",
    modal_continue: "कंसोल में जाएं",
    modal_fineprint: "जारी रखने पर एक नई क्रिएटिव सेशन शुरू होगी।",
    brand_name: "CineVerse AI Studio",
    brand_tag: "प्रीमियम व्हाइट मिनिमल SaaS",
    nav_storyline: "कहानी",
    nav_screenplay: "स्क्रीनप्ले",
    nav_characters: "चरित्र",
    nav_sound: "साउंड डिज़ाइन",
    chip_console: "स्टूडियो कंसोल",
    greeting: "स्वागत है। आइए कुछ सिनेमैटिक बनाएं।",
    topbar_sub: "प्रोडक्शन कंसोल तैयार है।",
    language: "भाषा",
    badge_studio: "स्टूडियो मोड",
    label_production: "प्रोडक्शन कंसोल",
    title_storyline: "कहानी",
    subtitle_storyline: "अपने फिल्म विचार को सिनेमैटिक सटीकता से लिखें।",
    story_label: "आपका कहानी विचार",
    story_placeholder: "एक दूरदर्शी निर्देशक एक रील खोजता है जो हर कट के साथ वास्तविकता बदल देती है...",
    generate_btn: "प्रोडक्शन पैक बनाएं",
    label_script: "स्क्रिप्ट वर्कस्पेस",
    title_screenplay: "स्क्रीनप्ले",
    subtitle_screenplay: "सिनेमैटिक स्पेसिंग के साथ प्रोफेशनल फॉर्मेटिंग।",
    download_txt: "TXT डाउनलोड",
    download_pdf: "PDF डाउनलोड",
    download_docx: "DOCX डाउनलोड",
    label_characters: "चरित्र इंटेलिजेंस",
    title_characters: "चरित्र प्रोफाइल",
    subtitle_characters: "कास्टिंग-रेडी प्रोफाइल और नैरेटिव आर्क्स।",
    label_sound: "साउंड लैब",
    title_sound: "साउंड डिज़ाइन",
    subtitle_sound: "हर सीन के लिए टाइमलाइन-फोकस्ड मिक्स प्लान।",
    status_analyzing: "आपकी कहानी का विश्लेषण हो रहा है...",
    status_generating: "स्क्रीनप्ले और प्रोडक्शन नोट्स बन रहे हैं...",
    status_complete: "जनरेशन पूरा। स्क्रीनप्ले दिखाया जा रहा है।",
    status_failed: "जनरेशन विफल। कृपया फिर से प्रयास करें।",
    err_username_short: "कृपया कम से कम 2 अक्षर दर्ज करें।",
    err_story_short: "कृपया कम से कम 10 अक्षर लिखें।",
    err_generation_failed: "जनरेशन विफल।"
  },
  te: {
    hero_eyebrow: "CineVerse AI Studio",
    hero_title: "ప్రత్యక్ష మేధస్సు.",
    hero_subtitle: "స్క్రీన్‌ప్లే, పాత్రలు, సౌండ్ డిజైన్ కోసం ఆధునిక AI ప్రొడక్షన్ సూట్.",
    hero_cta_primary: "స్టూడియోలోకి వెళ్లండి",
    hero_cta_secondary: "డెమో చూడండి",
    feature_scripts_title: "స్టూడియో-గ్రేడ్ స్క్రిప్ట్‌లు",
    feature_scripts_desc: "WGA-అలైన్‌డ్ ఫార్మాటింగ్, సినిమా పేసింగ్‌తో.",
    feature_characters_title: "క్యారెక్టర్ ఇంటెలిజెన్స్",
    feature_characters_desc: "ఆర్క్స్, మోటివేషన్‌తో కాస్టింగ్-రెడీ ప్రొఫైల్స్.",
    feature_sound_title: "సౌండ్ ల్యాబ్ ప్లానింగ్",
    feature_sound_desc: "సీన్-ఆధారిత మిక్స్‌లు, ఫోలీ, స్కోర్ నోట్స్.",
    modal_title: "మీ యూజర్ పేరు నమోదు చేయండి",
    modal_desc: "మీ వ్యక్తిగత ప్రొడక్షన్ కన్సోల్ సిద్ధంగా ఉంది.",
    modal_username_label: "యూజర్ పేరు",
    modal_username_placeholder: "ఉదా., మీరా",
    modal_continue: "కన్సోల్‌లోకి ప్రవేశించండి",
    modal_fineprint: "కొనసాగితే కొత్త క్రియేటివ్ సెషన్ ప్రారంభమవుతుంది.",
    brand_name: "CineVerse AI Studio",
    brand_tag: "ప్రీమియం వైట్ మినిమల్ SaaS",
    nav_storyline: "కథా రేఖ",
    nav_screenplay: "స్క్రీన్‌ప్లే",
    nav_characters: "పాత్రలు",
    nav_sound: "సౌండ్ డిజైన్",
    chip_console: "స్టూడియో కన్సోల్",
    greeting: "స్వాగతం. సినిమా తరహా దాన్ని సృష్టిద్దాం.",
    topbar_sub: "ప్రొడక్షన్ కన్సోల్ సిద్ధంగా ఉంది.",
    language: "భాష",
    badge_studio: "స్టూడియో మోడ్",
    label_production: "ప్రొడక్షన్ కన్సోల్",
    title_storyline: "కథా రేఖ",
    subtitle_storyline: "మీ సినిమా ఆలోచనను సినెమాటిక్‌గా వివరించండి.",
    story_label: "మీ కథా ఆలోచన",
    story_placeholder: "ప్రతి కట్‌తో నిజాన్ని మార్చే రీల్‌ను ఒక దర్శకుడు కనుగొంటాడు...",
    generate_btn: "ప్రొడక్షన్ ప్యాక్ రూపొందించండి",
    label_script: "స్క్రిప్ట్ వర్క్‌స్పేస్",
    title_screenplay: "స్క్రీన్‌ప్లే",
    subtitle_screenplay: "సినెమాటిక్ స్పేసింగ్‌తో ప్రొఫెషనల్ ఫార్మాటింగ్.",
    download_txt: "TXT డౌన్లోడ్",
    download_pdf: "PDF డౌన్లోడ్",
    download_docx: "DOCX డౌన్లోడ్",
    label_characters: "క్యారెక్టర్ ఇంటెలిజెన్స్",
    title_characters: "క్యారెక్టర్ ప్రొఫైల్స్",
    subtitle_characters: "ఆర్క్స్‌తో కాస్టింగ్-రెడీ ప్రొఫైల్స్.",
    label_sound: "సౌండ్ ల్యాబ్",
    title_sound: "సౌండ్ డిజైన్",
    subtitle_sound: "ప్రతి సీన్‌కు టైమ్‌లైన్-ఫోకస్డ్ మిక్స్ ప్లాన్.",
    status_analyzing: "మీ కథను విశ్లేషిస్తోంది...",
    status_generating: "స్క్రీన్‌ప్లే మరియు ప్రొడక్షన్ నోట్స్ రూపొందుతున్నాయి...",
    status_complete: "జనరేషన్ పూర్తైంది. స్క్రీన్‌ప్లే చూపుతోంది.",
    status_failed: "జనరేషన్ విఫలమైంది. మళ్లీ ప్రయత్నించండి.",
    err_username_short: "దయచేసి కనీసం 2 అక్షరాలు నమోదు చేయండి.",
    err_story_short: "దయచేసి కనీసం 10 అక్షరాలు ఇవ్వండి.",
    err_generation_failed: "జనరేషన్ విఫలమైంది."
  },
  ta: {
    hero_eyebrow: "CineVerse AI Studio",
    hero_title: "நேரடி நுண்ணறிவு.",
    hero_subtitle: "திரைக்கதை, பாத்திரங்கள், சவுண்ட் டிசைனுக்கான நவீன AI தயாரிப்பு தொகுப்பு.",
    hero_cta_primary: "ஸ்டுடியோவில் நுழையுங்கள்",
    hero_cta_secondary: "டெமோ பார்க்க",
    feature_scripts_title: "ஸ்டுடியோ தர ஸ்கிரிப்ட்கள்",
    feature_scripts_desc: "WGA-ஒத்த வடிவமைப்பு, சினிமாடிக் வேகத்துடன்.",
    feature_characters_title: "பாத்திர நுண்ணறிவு",
    feature_characters_desc: "ஆர்க்குகளுடன் காஸ்டிங்-ரெடி ப்ரொஃபைல்கள்.",
    feature_sound_title: "சவுண்ட் லேப் திட்டமிடல்",
    feature_sound_desc: "சீன்-அடிப்படை மிக்சுகள், ஃபோலி, ஸ்கோர் குறிப்புகள்.",
    modal_title: "உங்கள் பயனர் பெயரை உள்ளிடவும்",
    modal_desc: "உங்களுக்கான தயாரிப்பு கன்சோல் தயார்.",
    modal_username_label: "பயனர் பெயர்",
    modal_username_placeholder: "எ.கா., மீரா",
    modal_continue: "கன்சோலில் நுழையுங்கள்",
    modal_fineprint: "தொடர்வதால் புதிய கிரியேட்டிவ் செஷன் தொடங்கும்.",
    brand_name: "CineVerse AI Studio",
    brand_tag: "பிரீமியம் வைட் மினிமல் SaaS",
    nav_storyline: "கதை வரி",
    nav_screenplay: "திரைக்கதை",
    nav_characters: "பாத்திரங்கள்",
    nav_sound: "சவுண்ட் டிசைன்",
    chip_console: "ஸ்டுடியோ கன்சோல்",
    greeting: "வரவேற்கிறோம். சினிமாடிக் ஒன்றை உருவாக்கலாம்.",
    topbar_sub: "தயாரிப்பு கன்சோல் தயார்.",
    language: "மொழி",
    badge_studio: "ஸ்டுடியோ மோடு",
    label_production: "தயாரிப்பு கன்சோல்",
    title_storyline: "கதை வரி",
    subtitle_storyline: "உங்கள் திரைப்பட யோசனையை சினிமாடிக் முறையில் விவரிக்கவும்.",
    story_label: "உங்கள் கதையோசனை",
    story_placeholder: "ஒவ்வொரு கட்-இலும் யதார்த்தத்தை மாற்றும் ரீலை ஒரு இயக்குநர் கண்டுபிடிக்கிறார்...",
    generate_btn: "தயாரிப்பு பேக் உருவாக்கவும்",
    label_script: "ஸ்கிரிப்ட் வொர்க்ஸ்பேஸ்",
    title_screenplay: "திரைக்கதை",
    subtitle_screenplay: "சினிமாடிக் ஸ்பேசிங்குடன் தொழில்முறை வடிவமைப்பு.",
    download_txt: "TXT பதிவிறக்கு",
    download_pdf: "PDF பதிவிறக்கு",
    download_docx: "DOCX பதிவிறக்கு",
    label_characters: "பாத்திர நுண்ணறிவு",
    title_characters: "பாத்திர ப்ரொஃபைல்கள்",
    subtitle_characters: "ஆர்க்குகளுடன் காஸ்டிங்-ரெடி ப்ரொஃபைல்கள்.",
    label_sound: "சவுண்ட் லேப்",
    title_sound: "சவுண்ட் டிசைன்",
    subtitle_sound: "ஒவ்வொரு சீனுக்குமான டைம்லைன்-மிக்ஸ் திட்டம்.",
    status_analyzing: "உங்கள் கதையை பகுப்பாய்வு செய்கிறது...",
    status_generating: "திரைக்கதை மற்றும் தயாரிப்பு குறிப்புகள் உருவாக்கப்படுகிறது...",
    status_complete: "உருவாக்கம் முடிந்தது. திரைக்கதை காட்டப்படுகிறது.",
    status_failed: "உருவாக்கம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.",
    err_username_short: "குறைந்தது 2 எழுத்துகள் உள்ளிடவும்.",
    err_story_short: "குறைந்தது 10 எழுத்துகள் உள்ளிடவும்.",
    err_generation_failed: "உருவாக்கம் தோல்வியடைந்தது."
  },
  kn: {
    hero_eyebrow: "CineVerse AI Studio",
    hero_title: "ನೆರ ಬುದ್ಧಿಮತ್ತೆ.",
    hero_subtitle: "ಸ್ಕ್ರೀನ್‌ಪ್ಲೇ, ಪಾತ್ರಗಳು ಮತ್ತು ಸೌಂಡ್ ಡಿಜೈನ್‌ಗಾಗಿ ಆಧುನಿಕ AI ಪ್ರೊಡಕ್ಷನ್ ಸ್ಯೂಟ್.",
    hero_cta_primary: "ಸ್ಟುಡಿಯೋ ಪ್ರವೇಶಿಸಿ",
    hero_cta_secondary: "ಡೆಮೋ ನೋಡಿ",
    feature_scripts_title: "ಸ್ಟುಡಿಯೋ-ಗ್ರೇಡ್ ಸ್ಕ್ರಿಪ್ಟ್‌ಗಳು",
    feature_scripts_desc: "WGA-ಸಮ್ಮತ ಫಾರ್ಮ್ಯಾಟಿಂಗ್ ಮತ್ತು ಸಿನೆಮ್ಯಾಟಿಕ್ ಪೇಸಿಂಗ್.",
    feature_characters_title: "ಕ್ಯಾರಕ್ಟರ್ ಇಂಟೆಲಿಜೆನ್ಸ್",
    feature_characters_desc: "ಆರ್ಕ್‌ಗಳು ಮತ್ತು ಮೋಟಿವೇಷನ್‌ನೊಂದಿಗೆ ಕಾಸ್ಟಿಂಗ್-ರೆಡಿ ಪ್ರೊಫೈಲ್‌ಗಳು.",
    feature_sound_title: "ಸೌಂಡ್ ಲ್ಯಾಬ್ ಪ್ಲ್ಯಾನಿಂಗ್",
    feature_sound_desc: "ಸೀನ್-ಆಧಾರಿತ ಮಿಕ್ಸ್‌ಗಳು, ಫೋಲಿ ಮತ್ತು ಸ್ಕೋರ್ ಟಿಪ್ಪಣಿಗಳು.",
    modal_title: "ನಿಮ್ಮ ಬಳಕೆದಾರ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",
    modal_desc: "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಪ್ರೊಡಕ್ಷನ್ ಕನ್ಸೋಲ್ ಸಿದ್ಧವಾಗಿದೆ.",
    modal_username_label: "ಬಳಕೆದಾರ ಹೆಸರು",
    modal_username_placeholder: "ಉದಾ., ಮೀರೆ",
    modal_continue: "ಕನ್ಸೋಲ್‌ಗೆ ಪ್ರವೇಶಿಸಿ",
    modal_fineprint: "ಮುಂದುವರಿಸಿದರೆ ಹೊಸ ಕ್ರಿಯೇಟಿವ್ ಸೆಷನ್ ಆರಂಭವಾಗುತ್ತದೆ.",
    brand_name: "CineVerse AI Studio",
    brand_tag: "ಪ್ರೀಮಿಯಂ ವೈಟ್ ಮಿನಿಮಲ್ SaaS",
    nav_storyline: "ಕಥಾ ರೇಖೆ",
    nav_screenplay: "ಸ್ಕ್ರೀನ್‌ಪ್ಲೇ",
    nav_characters: "ಪಾತ್ರಗಳು",
    nav_sound: "ಸೌಂಡ್ ಡಿಜೈನ್",
    chip_console: "ಸ್ಟುಡಿಯೋ ಕನ್ಸೋಲ್",
    greeting: "ಸ್ವಾಗತ. ಸಿನೆಮ್ಯಾಟಿಕ್ ಏನಾದರೂ ಸೃಷ್ಟಿಸೋಣ.",
    topbar_sub: "ಪ್ರೊಡಕ್ಷನ್ ಕನ್ಸೋಲ್ ಸಿದ್ಧವಾಗಿದೆ.",
    language: "ಭಾಷೆ",
    badge_studio: "ಸ್ಟುಡಿಯೋ ಮೋಡ್",
    label_production: "ಪ್ರೊಡಕ್ಷನ್ ಕನ್ಸೋಲ್",
    title_storyline: "ಕಥಾ ರೇಖೆ",
    subtitle_storyline: "ನಿಮ್ಮ ಚಿತ್ರ ಕಥಾವಿಚಾರವನ್ನು ಸಿನೆಮ್ಯಾಟಿಕ್ ರೀತಿಯಲ್ಲಿ ವಿವರಿಸಿ.",
    story_label: "ನಿಮ್ಮ ಕಥಾ ಆಲೋಚನೆ",
    story_placeholder: "ಪ್ರತಿ ಕಟ್ ಜೊತೆ ವಾಸ್ತವಿಕತೆಯನ್ನು ಬದಲಿಸುವ ರೀಲನ್ನು ಒಬ್ಬ ನಿರ್ದೇಶಕ ಕಂಡುಕೊಳ್ಳುತ್ತಾನೆ...",
    generate_btn: "ಪ್ರೊಡಕ್ಷನ್ ಪ್ಯಾಕ್ ರಚಿಸಿ",
    label_script: "ಸ್ಕ್ರಿಪ್ಟ್ ವರ್ಕ್‌ಸ್ಪೇಸ್",
    title_screenplay: "ಸ್ಕ್ರೀನ್‌ಪ್ಲೇ",
    subtitle_screenplay: "ಸಿನೆಮ್ಯಾಟಿಕ್ ಸ್ಪೇಸಿಂಗ್ ಜೊತೆಗೆ ವೃತ್ತಿಪರ ಫಾರ್ಮ್ಯಾಟಿಂಗ್.",
    download_txt: "TXT ಡೌನ್‌ಲೋಡ್",
    download_pdf: "PDF ಡೌನ್‌ಲೋಡ್",
    download_docx: "DOCX ಡೌನ್‌ಲೋಡ್",
    label_characters: "ಕ್ಯಾರಕ್ಟರ್ ಇಂಟೆಲಿಜೆನ್ಸ್",
    title_characters: "ಕ್ಯಾರಕ್ಟರ್ ಪ್ರೊಫೈಲ್‌ಗಳು",
    subtitle_characters: "ಆರ್ಕ್‌ಗಳೊಂದಿಗೆ ಕಾಸ್ಟಿಂಗ್-ರೆಡಿ ಪ್ರೊಫೈಲ್‌ಗಳು.",
    label_sound: "ಸೌಂಡ್ ಲ್ಯಾಬ್",
    title_sound: "ಸೌಂಡ್ ಡಿಜೈನ್",
    subtitle_sound: "ಪ್ರತಿ ಸೀನ್‌ಗೆ ಟೈಮ್‌ಲೈನ್-ಫೋಕಸ್ಡ್ ಮಿಕ್ಸ್ ಪ್ಲ್ಯಾನ್.",
    status_analyzing: "ನಿಮ್ಮ ಕಥೆಯನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
    status_generating: "ಸ್ಕ್ರೀನ್‌ಪ್ಲೇ ಮತ್ತು ಪ್ರೊಡಕ್ಷನ್ ನೋಟ್ಸ್ ತಯಾರಾಗುತ್ತಿವೆ...",
    status_complete: "ಜನರೇಷನ್ ಮುಗಿದಿದೆ. ಸ್ಕ್ರೀನ್‌ಪ್ಲೇ ತೋರಿಸಲಾಗುತ್ತಿದೆ.",
    status_failed: "ಜನರೇಷನ್ ವಿಫಲವಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    err_username_short: "ದಯವಿಟ್ಟು ಕನಿಷ್ಠ 2 ಅಕ್ಷರಗಳನ್ನು ನಮೂದಿಸಿ.",
    err_story_short: "ದಯವಿಟ್ಟು ಕನಿಷ್ಠ 10 ಅಕ್ಷರಗಳನ್ನು ನೀಡಿ.",
    err_generation_failed: "ಜನರೇಷನ್ ವಿಫಲವಾಗಿದೆ."
  },
  ml: {
    hero_eyebrow: "CineVerse AI Studio",
    hero_title: "നേരിട്ടുള്ള ബുദ്ധിമत्ता.",
    hero_subtitle: "സ്ക്രീൻപ്ലേ, കഥാപാത്രങ്ങൾ, സൗണ്ട് ഡിസൈൻ എന്നിവയ്ക്കുള്ള ആധുനിക AI പ്രൊഡക്ഷൻ സ്യൂട്ട്.",
    hero_cta_primary: "സ്റ്റുഡിയോയിൽ പ്രവേശിക്കുക",
    hero_cta_secondary: "ഡെമോ കാണുക",
    feature_scripts_title: "സ്റ്റുഡിയോ ഗ്രേഡ് സ്ക്രിപ്റ്റുകൾ",
    feature_scripts_desc: "WGA-അലൈൻഡ് ഫോർമാറ്റിംഗ്, സിനിമാറ്റിക് പേസിംഗ്.",
    feature_characters_title: "ക്യാരക്ടർ ഇന്റലിജൻസ്",
    feature_characters_desc: "ആർക്കുകളും പ്രേരണയും ഉള്ള കാസ്റ്റിംഗ്-റെഡി പ്രൊഫൈലുകൾ.",
    feature_sound_title: "സൗണ്ട് ലാബ് പ്ലാനിംഗ്",
    feature_sound_desc: "സീൻ-ബേസ്ഡ് മിക്സുകൾ, ഫോലി, സ്കോർ നോട്ടുകൾ.",
    modal_title: "നിങ്ങളുടെ ഉപയോക്തൃ നാമം നൽകുക",
    modal_desc: "നിങ്ങളുടെ വ്യക്തിഗത പ്രൊഡക്ഷൻ കൺസോൾ തയ്യാറാണ്.",
    modal_username_label: "ഉപയോക്തൃ നാമം",
    modal_username_placeholder: "ഉദാ., മീര",
    modal_continue: "കൺസോളിലേക്ക് കടക്കുക",
    modal_fineprint: "തുടരുന്നതിലൂടെ പുതിയ ക്രിയേറ്റീവ് സെഷൻ തുടങ്ങുന്നു.",
    brand_name: "CineVerse AI Studio",
    brand_tag: "പ്രീമിയം വൈറ്റ് മിനിമൽ SaaS",
    nav_storyline: "കഥാ രേഖ",
    nav_screenplay: "സ്ക്രീൻപ്ലേ",
    nav_characters: "കഥാപാത്രങ്ങൾ",
    nav_sound: "സൗണ്ട് ഡിസൈൻ",
    chip_console: "സ്റ്റുഡിയോ കൺസോൾ",
    greeting: "സ്വാഗതം. സിനിമാറ്റിക് എന്തെങ്കിലും സൃഷ്ടിക്കാം.",
    topbar_sub: "പ്രൊഡക്ഷൻ കൺസോൾ റെഡി.",
    language: "ഭാഷ",
    badge_studio: "സ്റ്റുഡിയോ മോഡ്",
    label_production: "പ്രൊഡക്ഷൻ കൺസോൾ",
    title_storyline: "കഥാ രേഖ",
    subtitle_storyline: "നിങ്ങളുടെ സിനിമാ ആശയം സിനിമാറ്റിക് രീതിയിൽ വിവരിക്കുക.",
    story_label: "നിങ്ങളുടെ കഥാ ആശയം",
    story_placeholder: "ഓരോ കട്ടിലും യാഥാർത്ഥ്യം മാറ്റുന്ന ഒരു റീൽ ഒരു സംവിധായകൻ കണ്ടെത്തുന്നു...",
    generate_btn: "പ്രൊഡക്ഷൻ പാക്ക് സൃഷ്ടിക്കുക",
    label_script: "സ്ക്രിപ്റ്റ് വർക്ക്സ്പേസ്",
    title_screenplay: "സ്ക്രീൻപ്ലേ",
    subtitle_screenplay: "സിനിമാറ്റിക് സ്പേസിംഗോടെ പ്രൊഫഷണൽ ഫോർമാറ്റിംഗ്.",
    download_txt: "TXT ഡൗൺലോഡ്",
    download_pdf: "PDF ഡൗൺലോഡ്",
    download_docx: "DOCX ഡൗൺലോഡ്",
    label_characters: "ക്യാരക്ടർ ഇന്റലിജൻസ്",
    title_characters: "ക്യാരക്ടർ പ്രൊഫൈലുകൾ",
    subtitle_characters: "ആർക്കുകളോടെ കാസ്റ്റിംഗ്-റെഡി പ്രൊഫൈലുകൾ.",
    label_sound: "സൗണ്ട് ലാബ്",
    title_sound: "സൗണ്ട് ഡിസൈൻ",
    subtitle_sound: "ഓരോ സീനിനും ടൈംലൈൻ-ഫോകസ്ഡ് മിക്സ് പ്ലാൻ.",
    status_analyzing: "നിങ്ങളുടെ കഥ വിശകലനം ചെയ്യുന്നു...",
    status_generating: "സ്ക്രീൻപ്ലേയും പ്രൊഡക്ഷൻ നോട്ടുകളും തയ്യാറാകുന്നു...",
    status_complete: "ജനറേഷൻ പൂർത്തിയായി. സ്ക്രീൻപ്ലേ കാണിക്കുന്നു.",
    status_failed: "ജനറേഷൻ പരാജയപ്പെട്ടു. വീണ്ടും ശ്രമിക്കുക.",
    err_username_short: "കുറഞ്ഞത് 2 അക്ഷരങ്ങൾ നൽകുക.",
    err_story_short: "കുറഞ്ഞത് 10 അക്ഷരങ്ങൾ നൽകുക.",
    err_generation_failed: "ജനറേഷൻ പരാജയപ്പെട്ടു."
  }
};

function t(key) {
  const lang = languageSelect?.value || "en";
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function applyTranslations(lang) {
  const dict = I18N[lang] || I18N.en;
  document.documentElement.lang = lang || "en";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && dict[key]) el.setAttribute("placeholder", dict[key]);
  });
}

const storedLang = localStorage.getItem("cv_lang") || "en";
if (languageSelect) {
  languageSelect.value = I18N[storedLang] ? storedLang : "en";
  languageSelect.addEventListener("change", () => {
    const next = languageSelect.value;
    localStorage.setItem("cv_lang", next);
    applyTranslations(next);
  });
}
applyTranslations(I18N[storedLang] ? storedLang : "en");

const storedTheme = localStorage.getItem("cv_theme") || "light";
setTheme(storedTheme);

function setTheme(mode) {
  const theme = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("cv_theme", theme);
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "☀" : "☾";
}

themeToggle?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

function show(el) { el.classList.remove("is-hidden"); }
function hide(el) { el.classList.add("is-hidden"); }

// Subtle fade for main page shell
window.addEventListener("load", () => {
  document.querySelectorAll(".page-sheet").forEach((sheet) => {
    sheet.style.opacity = 0;
    sheet.style.transform = "translateY(6px)";
    requestAnimationFrame(() => {
      sheet.style.transition = "opacity 320ms ease, transform 320ms ease";
      sheet.style.opacity = 1;
      sheet.style.transform = "translateY(0)";
    });
  });
});

function setActiveView(isLanding) {
  if (isLanding) {
    landingView.classList.add("view--active");
    landingView.classList.remove("view--hidden");
    dashboardView.classList.add("view--hidden");
  } else {
    landingView.classList.remove("view--active");
    landingView.classList.add("view--hidden");
    dashboardView.classList.remove("view--hidden");
  }
}

function toggleSidebar(open) {
  if (!sidebar) return;
  sidebar.classList.toggle("is-open", open);
  if (sidebarBackdrop) sidebarBackdrop.classList.toggle("is-hidden", !open);
}

openUsernameModalBtn?.addEventListener("click", () => {
  hide(usernameError);
  modalBackdrop?.classList.remove("is-hidden");
  usernameInput?.focus();
});

closeUsernameModalBtn?.addEventListener("click", () => {
  modalBackdrop?.classList.add("is-hidden");
});

modalBackdrop?.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.add("is-hidden");
});

usernameInput?.addEventListener("input", () => {
  continueBtn.disabled = usernameInput.value.trim().length < 2;
});

usernameForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = usernameInput.value.trim();
  if (val.length < 2) {
    usernameError.textContent = t("err_username_short");
    show(usernameError);
    return;
  }
  currentUser = val;
  modalBackdrop.classList.add("is-hidden");
  setActiveView(false);
});

sidebarToggle?.addEventListener("click", () => toggleSidebar(true));
sidebarBackdrop?.addEventListener("click", () => toggleSidebar(false));

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("is-disabled")) return;
    const page = btn.dataset.page;
    navItems.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    pages.forEach((p) => p.classList.toggle("is-active", p.dataset.page === page));
    toggleSidebar(false);
  });
});

function enableNav() {
  navItems.forEach((btn) => {
    btn.classList.remove("is-disabled");
    btn.disabled = false;
  });
}

function setActivePage(pageName) {
  navItems.forEach((b) => b.classList.remove("is-active"));
  pages.forEach((p) => p.classList.toggle("is-active", p.dataset.page === pageName));
  const match = Array.from(navItems).find((b) => b.dataset.page === pageName);
  if (match) match.classList.add("is-active");
}

function setStatus(message) {
  if (!globalStatus) return;
  globalStatus.textContent = message || "";
}

function safeText(text) {
  return (text || "").toString();
}

function formatScreenplay(text) {
  const lines = safeText(text).split(/\r?\n/);
  const html = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return `<div class="sp-action">&nbsp;</div>`;
    const upper = trimmed.toUpperCase();

    if (/^(INT\.|EXT\.|INT\/EXT\.|EST\.)/.test(upper)) {
      return `<div class="sp-scene">${trimmed}</div>`;
    }
    if (/(TO:|FADE OUT\.|FADE IN\.|CUT TO:|DISSOLVE TO:)$/.test(upper)) {
      return `<div class="sp-transition">${trimmed}</div>`;
    }
    if (/^\(.+\)$/.test(trimmed)) {
      return `<div class="sp-parenthetical">${trimmed}</div>`;
    }
    if (/^[A-Z0-9 ()'.-]{2,}$/.test(upper) && upper === trimmed) {
      return `<div class="sp-character">${trimmed}</div>`;
    }
    return `<div class="sp-action">${trimmed}</div>`;
  }).join("");
  return html;
}

async function generate() {
  hide(storyError);
  hide(screenplayError);
  hide(charactersError);
  hide(soundError);

  const story = storyInput.value.trim();
  if (story.length < 10) {
    storyError.textContent = t("err_story_short");
    show(storyError);
    return;
  }

  generateBtn.disabled = true;
  generateSpinner.classList.remove("is-hidden");
  setStatus(t("status_analyzing"));

  try {
    setStatus(t("status_generating"));
    const res = await fetch("/generate_content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story, username: currentUser, language: languageSelect?.value || "en" })
    });

    if (!res.ok) throw new Error(t("err_generation_failed"));

    const data = await res.json();
    lastPayload = data;

    screenplayOutput.innerHTML = formatScreenplay(data.screenplay || data.script || "");
    charactersOutput.innerHTML = (data.characters_html || data.characters || "")
      ? renderCharacters(data.characters_html || data.characters)
      : "";
    soundOutput.innerHTML = (data.sound_design_html || data.sound_design || "")
      ? renderSound(data.sound_design_html || data.sound_design)
      : "";

    enableNav();
    setActivePage("screenplay");
    setStatus(t("status_complete"));
  } catch (err) {
    storyError.textContent = err.message || "Something went wrong.";
    show(storyError);
    setStatus(t("status_failed"));
  } finally {
    generateSpinner.classList.add("is-hidden");
    generateBtn.disabled = false;
    setTimeout(() => setStatus(""), 2200);
  }
}

function renderCharacters(payload) {
  if (Array.isArray(payload)) {
    return payload.map((c) => `
      <div class="card">
        <h4 class="card__title">${safeText(c.name)}</h4>
        <div class="card__divider"></div>
        <div class="card__section"><strong>Background:</strong> ${safeText(c.background)}</div>
        <div class="card__section"><strong>Motivation:</strong> ${safeText(c.motivation)}</div>
        <div class="card__section"><strong>Conflict:</strong> ${safeText(c.conflict)}</div>
        <div class="card__section"><strong>Arc:</strong> ${safeText(c.arc)}</div>
      </div>
    `).join("");
  }
  const raw = safeText(payload).trim();
  if (!raw) return "";

  // Split plain-text payload by '---' dividers into individual cards.
  const blocks = raw
    .split(/^\s*---\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  const renderBlock = (block) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const nameLineIdx = lines.findIndex((l) => /^name\s*:/i.test(l));
    let name = "Character";
    if (nameLineIdx >= 0) {
      name = lines[nameLineIdx].replace(/^name\s*:/i, "").trim() || name;
      lines.splice(nameLineIdx, 1);
    }
    const body = lines.join("\n") || block;
    const formattedBody = safeText(body).replace(/\r?\n/g, "<br>");

    return `
      <div class="card">
        <h4 class="card__title">${safeText(name)}</h4>
        <div class="card__divider"></div>
        <div class="card__section">${formattedBody}</div>
      </div>
    `;
  };

  return blocks.map(renderBlock).join("");
}

function renderSound(payload) {
  if (Array.isArray(payload)) {
    return payload.map((s) => `
      <div class="sound__item">
        <div class="sound__title">${safeText(s.scene)}</div>
        <div class="sound__body">${safeText(s.details || s.plan || "")}</div>
      </div>
    `).join("");
  }
  const raw = safeText(payload).trim();
  if (!raw) return "";

  const blocks = raw
    .split(/(?=SCENE\s*\d+:)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const formatBody = (text) => safeText(text).replace(/\r?\n/g, "<br>");

  if (blocks.length <= 1) {
    return `
      <div class="sound__item">
        <div class="sound__title">${t("title_sound")}</div>
        <div class="sound__body">${formatBody(raw)}</div>
      </div>
    `;
  }

  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const firstLine = lines[0] || "Sound Design";
    const body = lines.slice(1).join("\n").trim() || block;
    return `
      <div class="sound__item">
        <div class="sound__title">${safeText(firstLine)}</div>
        <div class="sound__body">${formatBody(body)}</div>
      </div>
    `;
  }).join("");
}

generateBtn?.addEventListener("click", generate);

downloadButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const format = btn.dataset.download;
    const type = btn.dataset.downloadType || "screenplay";
    if (!lastPayload) return;

    try {
      downloadStatus.textContent = "Preparing file...";
      const res = await fetch(`/download/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, type, payload: lastPayload })
      });
      if (!res.ok) throw new Error("Download failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      downloadStatus.textContent = "Download ready.";
      setTimeout(() => (downloadStatus.textContent = ""), 1200);
    } catch (err) {
      downloadStatus.textContent = err.message || "Download error.";
    }
  });
});
