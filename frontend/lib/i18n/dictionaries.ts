export type Locale = "vi" | "en" | "ja";

export interface MockLine {
  type: "query" | "result" | "upload" | "status";
  text: string;
}

export interface AgentEntry {
  name: string;
  role: string;
  desc: string;
  mockLines: MockLine[];
}

export interface PlanEntry {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

export interface FaqEntry {
  q: string;
  a: string;
}

export interface StepEntry {
  num: string;
  title: string;
  desc: string;
}

export interface Dict {
  common: {
    delete: string;
    save: string;
    cancel: string;
  };
  sidebar: {
    newChat: string;
    collapse: string;
    expand: string;
    tabs: { chats: string; docs: string; reports: string };
    searchChats: string;
    searchReports: string;
    noReports: string;
    noResultsFor: string;
    accountUsage: string;
    plan: { free: string; pro: string; team: string };
    language: string;
    reportTypes: { research: string; trending: string; discovery: string };
    dateLabels: { today: string; yesterday: string };
  };
  chat: {
    analyzing: string;
    synthesizing: string;
    processing: string;
    processingEllipsis: string;
    searchMulti: string;
    searchArxiv: string;
    searchNasaImages: string;
    searchApod: string;
    searchWeb: string;
    searchGeneric: string;
    searchSources: string;
    analyzeDoc: string;
    generateReport: string;
    analyzeImage: string;
    thinkingHeader: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    agentDescs: { search: string; notebook: string; image: string; report: string };
  };
  inputBar: {
    addDocsContext: string;
    noDocuments: string;
    attachImage: string;
    uploadImage: string;
    imageTooLarge: string;
    placeholder: string;
    shiftEnterHint: string;
    agentsActive: string;
  };
  landing: {
    nav: {
      features: string;
      demo: string;
      pricing: string;
      faq: string;
      getStarted: string;
    };
    hero: {
      tag: string;
      title: string;
      titleAccent: string;
      subtitle: string;
      cta1: string;
      cta2: string;
      socialProof: string;
    };
    features: {
      eyebrow: string;
      title: string;
      subtitle: string;
      learnMore: string;
    };
    agents: {
      search: AgentEntry;
      notebook: AgentEntry;
      image: AgentEntry;
      report: AgentEntry;
    };
    howItWorks: { eyebrow: string; title: string };
    steps: StepEntry[];
    pricing: {
      eyebrow: string;
      title: string;
      subtitle: string;
      popular: string;
    };
    plans: PlanEntry[];
    faq: { eyebrow: string; title: string };
    faqItems: FaqEntry[];
    newsletter: {
      title: string;
      subtitle: string;
      placeholder: string;
      cta: string;
      success: string;
      nospam: string;
    };
    footer: {
      tagline: string;
      cols: Array<{ title: string; links: string[] }>;
      copyright: string;
    };
    demo: {
      sectionEyebrow: string;
      sectionTitle: string;
      sectionSubtitle: string;
      sessionTitle: string;
      replay: string;
      send: string;
      inputPlaceholder: string;
      searchingStatus: string;
      composingStatus: string;
      replyPrefix: string;
      replySuffix: string;
      userMsg: string;
      agentStatuses: string[];
      assistantText: string;
      dataLabels: string[];
      dataValues: string[];
      sources: string;
    };
  };
  account: {
    tabs: { account: string; usage: string; plan: string };
    fields: { email: string; displayName: string; role: string; status: string };
    roleValues: { admin: string; user: string };
    statusValues: { active: string; locked: string };
    logout: string;
    changePassword: string;
    pwPlaceholders: { current: string; newPw: string; confirm: string };
    pwSave: string;
    pwSaving: string;
    pwErrors: { required: string; mismatch: string; tooShort: string; wrong: string; success: string };
    activityTitle: string;
    loading: string;
    noActivity: string;
    noData: string;
    estimatedCost: string;
    costNote: string;
    tokensThisMonth: string;
    plan: {
      currentBadge: string;
      contactUpgrade: string;
      noteOptional: string;
      send: string;
      sending: string;
      cancel: string;
      contactError: string;
      contactSuccess: string;
      upgradeNote: string;
    };
    planInfo: {
      free: [string, string, string];
      pro: [string, string, string];
      team: [string, string, string];
    };
  };
  reportViewer: {
    loading: string;
    error: string;
    typeResearch: string;
    typeTrending: string;
    typeDiscovery: string;
    headerBadge: string;
    exportPdf: string;
    sectionContent: string;
    discoveryBadge: string;
    discoveryTitle: string;
    morphologyNote: string;
    quantBadge: string;
    topicsLabel: string;
    timelineLabel: string;
    interestLabel: string;
    authorsLabel: string;
    refBadge: string;
    refTitle: string;
    footerPrefix: string;
    footerUpdated: string;
    footerSources: string;
    dateLocale: string;
  };
  messageBody: {
    images: string;
    citations: string;
    papers: string;
    webSources: string;
    page: string;
    fromAnalysis: string;
    generatingReport: string;
    openReport: string;
    createDiscovery: string;
    errorRateLimit: string;
    errorServer: string;
  };
}

const vi: Dict = {
  common: {
    delete: "Xóa",
    save: "Lưu",
    cancel: "Hủy",
  },
  sidebar: {
    newChat: "Cuộc trò chuyện mới",
    collapse: "Thu gọn sidebar",
    expand: "Mở sidebar",
    tabs: { chats: "Trò chuyện", docs: "Tài liệu", reports: "Báo cáo" },
    searchChats: "Tìm hội thoại...",
    searchReports: "Tìm báo cáo...",
    noReports: "Chưa có báo cáo. Dùng @report trong chat.",
    noResultsFor: "Không có kết quả cho",
    accountUsage: "Tài khoản & Mức sử dụng",
    plan: { free: "Gói Free", pro: "Gói Pro", team: "Gói Team" },
    language: "Ngôn ngữ",
    reportTypes: { research: "NGHIÊN CỨU", trending: "XU HƯỚNG", discovery: "KHÁM PHÁ" },
    dateLabels: { today: "Hôm nay", yesterday: "Hôm qua" },
  },
  chat: {
    analyzing: "Phân tích yêu cầu",
    synthesizing: "Tổng hợp câu trả lời",
    processing: "Xử lý",
    processingEllipsis: "Đang xử lý…",
    searchMulti: "Tìm kiếm đa nguồn",
    searchArxiv: "Tìm kiếm nghiên cứu arXiv",
    searchNasaImages: "Tìm kiếm hình ảnh NASA",
    searchApod: "Tìm kiếm ảnh thiên văn APOD",
    searchWeb: "Tìm kiếm trang web",
    searchGeneric: "Tìm kiếm thông tin",
    searchSources: "Tìm kiếm",
    analyzeDoc: "Phân tích tài liệu người dùng",
    generateReport: "Tạo báo cáo",
    analyzeImage: "Phân tích hình ảnh",
    thinkingHeader: "Quá trình xử lý · {n} bước",
    welcomeTitle: "Hỏi về vũ trụ",
    welcomeSubtitle: "Tìm kiếm, phân tích và báo cáo cùng các agent AI chuyên biệt.",
    agentDescs: {
      search: "Tìm kiếm NASA · arXiv",
      notebook: "Phân tích tài liệu",
      image: "Phân tích ảnh thiên văn",
      report: "Báo cáo xu hướng",
    },
  },
  inputBar: {
    addDocsContext: "Thêm tài liệu làm ngữ cảnh",
    noDocuments: "Chưa có tài liệu nào",
    attachImage: "Đính kèm ảnh",
    uploadImage: "Tải ảnh lên",
    imageTooLarge: "Ảnh quá lớn (tối đa 10MB)",
    placeholder: "Hỏi về bất kỳ chủ đề thiên văn nào...",
    shiftEnterHint: "Shift + Enter để xuống dòng",
    agentsActive: "5 agent đang hoạt động",
  },
  landing: {
    nav: {
      features: "Tính năng",
      demo: "Demo",
      pricing: "Bảng giá",
      faq: "FAQ",
      getStarted: "Bắt đầu ngay",
    },
    hero: {
      tag: "Nền Tảng AI Đa Tác Tử",
      title: "Đội Nghiên Cứu AI của Bạn",
      titleAccent: "cho Vũ Trụ",
      subtitle: "AI chuyên biệt tìm kiếm, phân tích và tổng hợp nghiên cứu thiên văn — để bạn tập trung khám phá.",
      cta1: "Khám Phá Ngay",
      cta2: "Xem Cách Hoạt Động",
      socialProof: "2.000+ nhà nghiên cứu tin dùng",
    },
    features: {
      eyebrow: "Trí Tuệ Chuyên Biệt",
      title: "Bốn Tác Tử. Một Sứ Mệnh.",
      subtitle: "Mỗi tác tử chuyên một lĩnh vực, phối hợp liền mạch để cho kết quả tốt nhất.",
      learnMore: "Tìm hiểu thêm →",
    },
    agents: {
      search: {
        name: "Search Agent",
        role: "Tìm Kiếm & Nghiên Cứu",
        desc: "Tìm kiếm trên arXiv, NASA ADS và SIMBAD, xếp hạng theo độ liên quan trong vài giây.",
        mockLines: [
          { type: "query", text: 'Tìm kiếm: "Betelgeuse mass loss rate 2024-2026"' },
          { type: "result", text: "→ Tìm thấy 47 bài báo trên arXiv, ADS và NASA ADS" },
          { type: "result", text: "→ Kết quả tốt nhất: Harper et al. (2025) — Ṁ ≈ 1.2×10⁻⁶ M☉/yr" },
          { type: "result", text: "→ Đối chiếu với dữ liệu hình ảnh VLT/SPHERE" },
          { type: "status", text: "✓ Kết quả xếp hạng theo độ liên quan và số trích dẫn" },
        ],
      },
      notebook: {
        name: "Notebook Agent",
        role: "Phân Tích Tài Liệu",
        desc: "Tải lên PDF, CSV hoặc FITS. Tự động trích xuất và so sánh với nghiên cứu đã xuất bản.",
        mockLines: [
          { type: "upload", text: "📄 Đã tải lên: europa_spectroscopy_2025.pdf" },
          { type: "result", text: "→ Trích xuất 14 bảng dữ liệu, 8 biểu đồ phổ" },
          { type: "result", text: "→ Kết quả chính: Xác nhận hấp thụ NaCl tại 2.07μm" },
          { type: "result", text: "→ So sánh với Trumbo et al. (2023) — tín hiệu mạnh hơn 34%" },
          { type: "status", text: "✓ Tóm tắt có cấu trúc sẵn sàng để xuất" },
        ],
      },
      image: {
        name: "Image Agent",
        role: "Phân Tích Ảnh Thiên Văn",
        desc: "Nhận dạng thiên thể và phân tích hình thái thiên hà bằng mô hình CNN Galaxy Zoo.",
        mockLines: [
          { type: "upload", text: "🔭 Đã tải lên: ngc1300_hst.fits" },
          { type: "result", text: "→ Nhận dạng: Thiên hà xoắn ốc có cầu nối (SBb)" },
          { type: "result", text: "→ CNN Galaxy Zoo: cầu nối trung tâm — độ tin cậy 94%" },
          { type: "result", text: "→ Khoảng cách ước tính: ~61 Mpc · z ≈ 0.0185" },
          { type: "status", text: "✓ Phân tích hình thái hoàn thành · Sẵn sàng tìm kiếm thêm" },
        ],
      },
      report: {
        name: "Report Agent",
        role: "Tạo Báo Cáo",
        desc: "Biên soạn kết quả nghiên cứu thành báo cáo có cấu trúc với trích dẫn, sẵn sàng xuất bản.",
        mockLines: [
          { type: "status", text: '⏳ Đang tạo báo cáo: "Đánh giá Khả năng Sống được của Europa"' },
          { type: "result", text: "→ §1 Giới thiệu — Đặc điểm đại dương & bối cảnh" },
          { type: "result", text: "→ §2 Mô hình nhiệt thủy triều — Phân tích ngân sách năng lượng" },
          { type: "result", text: "→ §3 Thành phần bề mặt — Bằng chứng quang phổ" },
          { type: "result", text: "→ Tài liệu tham khảo: 23 nguồn · Sẵn sàng xuất LaTeX + PDF" },
          { type: "status", text: "✓ Báo cáo hoàn thành — 4.200 từ" },
        ],
      },
    },
    howItWorks: {
      eyebrow: "Cách Hoạt Động",
      title: "Từ Câu Hỏi đến Khám Phá",
    },
    steps: [
      {
        num: "01",
        title: "Hỏi hoặc Tải lên",
        desc: "Nhập câu hỏi hoặc tải tài liệu — bài báo, nhật ký quan sát, FITS, bất cứ thứ gì.",
      },
      {
        num: "02",
        title: "Các Tác Tử Phối Hợp",
        desc: "Các agent tìm kiếm, trích xuất và tổng hợp song song.",
      },
      {
        num: "03",
        title: "Nhận Kết Quả",
        desc: "Câu trả lời có cấu trúc, so sánh dữ liệu và báo cáo kèm trích dẫn đầy đủ.",
      },
    ],
    pricing: {
      eyebrow: "Bảng Giá",
      title: "Giá Cả Đơn Giản, Minh Bạch",
      subtitle: "Dùng miễn phí. Nâng cấp khi sẵn sàng.",
      popular: "Phổ biến",
    },
    plans: [
      {
        name: "Starter",
        price: "Miễn phí",
        period: "",
        desc: "Lý tưởng để khám phá các chủ đề thiên văn học",
        features: ["50 truy vấn / tháng", "Chat cơ bản với Chat Agent", "5 tài liệu tải lên", "Hỗ trợ cộng đồng"],
        cta: "Bắt đầu",
        highlight: false,
      },
      {
        name: "Pro",
        price: "$19",
        period: "/tháng",
        desc: "Dành cho nhà nghiên cứu và sinh viên nghiêm túc",
        features: ["Truy vấn không giới hạn", "Toàn bộ 4 tác tử chuyên biệt", "100 tài liệu / tháng", "Tạo báo cáo nghiên cứu", "Xử lý ưu tiên", "Hỗ trợ qua email"],
        cta: "Dùng thử miễn phí",
        highlight: true,
      },
      {
        name: "Team",
        price: "$49",
        period: "/người/tháng",
        desc: "Dành cho phòng lab và nhóm nghiên cứu",
        features: ["Tất cả tính năng Pro", "Thư viện nghiên cứu chung", "Cộng tác nhóm", "Truy cập API", "Tích hợp tùy chỉnh", "Hỗ trợ chuyên biệt"],
        cta: "Liên hệ mua",
        highlight: false,
      },
    ],
    faq: { eyebrow: "FAQ", title: "Câu Hỏi Thường Gặp" },
    faqItems: [
      {
        q: "Astro Mind hỗ trợ những loại nghiên cứu nào?",
        a: "Vật lý sao, ngoại hành tinh, vũ trụ học, hệ mặt trời — truy cập NASA ADS, arXiv, SIMBAD và Exoplanet Archive.",
      },
      {
        q: "Câu trả lời của AI có chính xác không?",
        a: "Mỗi câu trả lời kèm trích dẫn nguồn và ghi rõ mức độ không chắc chắn. Nên dùng như công cụ hỗ trợ, không thay thế bình duyệt.",
      },
      {
        q: "Tôi có thể tải lên dữ liệu quan sát không?",
        a: "Có. Notebook Agent nhận PDF, CSV, FITS và ảnh phổ biến, tự động so sánh với nghiên cứu đã xuất bản.",
      },
      {
        q: "Dữ liệu của tôi có được bảo mật không?",
        a: "File được mã hóa khi truyền và lưu trữ. Dữ liệu không dùng để huấn luyện mô hình. Gói Team có thêm kiểm soát truy cập.",
      },
      {
        q: "Tôi có cần kiến thức thiên văn không?",
        a: "Không cần. Agent tự điều chỉnh từ trình độ đại học đến tiến sĩ — chỉ cần hỏi tự nhiên.",
      },
      {
        q: "Tôi có thể xuất kết quả nghiên cứu không?",
        a: "Gói Pro và Team xuất PDF, LaTeX, BibTeX và JSON. Gói Starter có thể sao chép văn bản.",
      },
    ],
    newsletter: {
      title: "Tham Gia Đài Quan Sát",
      subtitle: "Cập nhật tính năng mới và khám phá thiên văn nổi bật.",
      placeholder: "you@university.edu",
      cta: "Đăng ký",
      success: "✓ Đăng ký thành công. Chào mừng bạn!",
      nospam: "Không spam. Hủy bất kỳ lúc nào.",
    },
    footer: {
      tagline: "Nghiên cứu thiên văn học được hỗ trợ bởi AI.",
      cols: [
        { title: "Sản phẩm", links: ["Tính năng", "Bảng giá", "Demo", "Nhật ký thay đổi", "Tài liệu API"] },
        { title: "Tài nguyên", links: ["Tài liệu", "Hướng dẫn", "Blog", "Bài báo nghiên cứu", "Trạng thái"] },
        { title: "Công ty", links: ["Giới thiệu", "Tuyển dụng", "Liên hệ", "Quyền riêng tư", "Điều khoản"] },
      ],
      copyright: "© 2026 Astro Mind. Bảo lưu mọi quyền.",
    },
    demo: {
      sectionEyebrow: "Thử Ngay",
      sectionTitle: "Xem Các Tác Tử Hoạt Động",
      sectionSubtitle: "Xem cách các agent AI phối hợp để trả lời một câu hỏi nghiên cứu.",
      sessionTitle: "Astro Mind — Phiên Nghiên Cứu",
      replay: "Phát lại",
      send: "Gửi",
      inputPlaceholder: "Hỏi về bất kỳ chủ đề thiên văn nào...",
      searchingStatus: "Search Agent đang tìm kiếm...",
      composingStatus: "Chat Agent đang soạn câu trả lời...",
      replyPrefix: "Câu hỏi hay về",
      replySuffix: "Trong phiên đầy đủ, các agent tìm kiếm, phân tích và tổng hợp kết quả kèm trích dẫn. Đăng ký để trải nghiệm!",
      userMsg: "Chúng ta biết gì về khả năng có sự sống trên Europa?",
      agentStatuses: [
        "Search Agent đang tìm kiếm trong cơ sở dữ liệu thiên văn...",
        "Notebook Agent đang xử lý 12 bài báo liên quan...",
        "Chat Agent đang soạn câu trả lời...",
      ],
      assistantText: "Europa là ứng cử viên hàng đầu cho sự sống ngoài Trái Đất. Nghiên cứu hiện tại cho thấy:",
      dataLabels: ["Độ sâu đại dương ngầm", "Thể tích đại dương", "Nhiệt độ bề mặt", "Hợp chất chính"],
      dataValues: ["60 – 150 km", "2 – 3× đại dương Trái Đất", "−160°C (xích đạo)", "NaCl, MgSO₄, O₂"],
      sources: "Pappalardo et al. (2025), NASA Europa Clipper preliminary data, Trumbo & Brown (2024)",
    },
  },
  account: {
    tabs: { account: "Tài khoản", usage: "Sử dụng", plan: "Gói" },
    fields: { email: "Email", displayName: "Tên hiển thị", role: "Vai trò", status: "Trạng thái" },
    roleValues: { admin: "Admin", user: "User" },
    statusValues: { active: "Hoạt động", locked: "Bị khoá" },
    logout: "Đăng xuất",
    changePassword: "Đổi mật khẩu",
    pwPlaceholders: { current: "Mật khẩu hiện tại", newPw: "Mật khẩu mới", confirm: "Xác nhận mới" },
    pwSave: "Đổi mật khẩu",
    pwSaving: "Đang lưu...",
    pwErrors: {
      required: "Vui lòng điền đầy đủ.",
      mismatch: "Mật khẩu mới không khớp.",
      tooShort: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      wrong: "Mật khẩu hiện tại không đúng.",
      success: "Đổi mật khẩu thành công.",
    },
    activityTitle: "Hoạt động của bạn",
    loading: "Đang tải...",
    noActivity: "Chưa có hoạt động trong khoảng thời gian này",
    noData: "Chưa có dữ liệu",
    estimatedCost: "Chi phí ước tính",
    costNote: "Ước tính $1.50/1M tokens (blended rate)",
    tokensThisMonth: "Tokens tháng này",
    plan: {
      currentBadge: "ĐANG DÙNG",
      contactUpgrade: "Liên hệ nâng cấp",
      noteOptional: "Ghi chú (tùy chọn)",
      send: "Gửi",
      sending: "Đang gửi...",
      cancel: "Huỷ",
      contactError: "Gửi thất bại. Vui lòng thử lại.",
      contactSuccess: "Đã gửi yêu cầu! Admin sẽ liên hệ với bạn sớm.",
      upgradeNote: 'Bấm "Liên hệ nâng cấp" và admin sẽ xử lý yêu cầu của bạn.',
    },
    planInfo: {
      free: ["50K tokens/tháng", "50 req/ngày", "3 tài liệu"],
      pro: ["500K tokens/tháng", "200 req/ngày", "20 tài liệu"],
      team: ["Không giới hạn", "Không giới hạn", "Không giới hạn"],
    },
  },
  reportViewer: {
    loading: "Đang tải…",
    error: "Không thể tải báo cáo",
    typeResearch: "Nghiên cứu chuyên sâu",
    typeTrending: "Báo cáo xu hướng",
    typeDiscovery: "Báo cáo khám phá",
    headerBadge: "◈ ASTRO MIND · BÁO CÁO NGHIÊN CỨU",
    exportPdf: "Xuất PDF",
    sectionContent: "Nội dung",
    discoveryBadge: "◈ PHÂN TÍCH CHI TIẾT",
    discoveryTitle: "Phân tích Chi tiết Thiên thể",
    morphologyNote: "✓ Hình thái phân tích bằng mô hình CNN (Galaxy Zoo).",
    quantBadge: "◈ DỮ LIỆU ĐỊNH LƯỢNG",
    topicsLabel: "Chủ đề nghiên cứu (arXiv)",
    timelineLabel: "Dòng thời gian phát hiện",
    interestLabel: "Mức độ quan tâm công chúng",
    authorsLabel: "Tác giả xuất hiện nhiều",
    refBadge: "◈ TÀI LIỆU THAM KHẢO",
    refTitle: "Tài liệu tham khảo",
    footerPrefix: "Generated by AstroMind AI",
    footerUpdated: "Dữ liệu cập nhật đến",
    footerSources: "Nguồn dữ liệu",
    dateLocale: "vi-VN",
  },
  messageBody: {
    images: "Hình ảnh",
    citations: "Dẫn chứng",
    papers: "Papers",
    webSources: "Nguồn web",
    page: "Trang",
    fromAnalysis: "Từ phân tích sâu",
    generatingReport: "Đang tạo báo cáo...",
    openReport: "Mở báo cáo →",
    createDiscovery: "✨ Tạo báo cáo khám phá từ phiên này",
    errorRateLimit: "Đã đạt giới hạn sử dụng. Vui lòng thử lại sau hoặc nâng cấp gói.",
    errorServer: "Lỗi: không gọi được máy chủ",
  },
};

const en: Dict = {
  common: {
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
  },
  sidebar: {
    newChat: "New Chat",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
    tabs: { chats: "Chats", docs: "Docs", reports: "Reports" },
    searchChats: "Search chats...",
    searchReports: "Search reports...",
    noReports: "No reports yet. Use @report in chat.",
    noResultsFor: "No results for",
    accountUsage: "Account & Usage",
    plan: { free: "Free Plan", pro: "Pro Plan", team: "Team Plan" },
    language: "Language",
    reportTypes: { research: "RESEARCH", trending: "TRENDING", discovery: "DISCOVERY" },
    dateLabels: { today: "Today", yesterday: "Yesterday" },
  },
  chat: {
    analyzing: "Analyzing request",
    synthesizing: "Synthesizing answer",
    processing: "Processing",
    processingEllipsis: "Processing…",
    searchMulti: "Multi-source search",
    searchArxiv: "Searching arXiv research",
    searchNasaImages: "Searching NASA images",
    searchApod: "Searching APOD",
    searchWeb: "Searching the web",
    searchGeneric: "Searching for information",
    searchSources: "Searching",
    analyzeDoc: "Analyzing user documents",
    generateReport: "Generating report",
    analyzeImage: "Analyzing image",
    thinkingHeader: "Processing · {n} steps",
    welcomeTitle: "Ask anything about the cosmos",
    welcomeSubtitle: "Search, analyze, and report with specialized AI agents.",
    agentDescs: {
      search: "Search NASA · arXiv",
      notebook: "Document analysis",
      image: "Astronomical image analysis",
      report: "Trend reports",
    },
  },
  inputBar: {
    addDocsContext: "Add docs as context",
    noDocuments: "No documents yet",
    attachImage: "Attach image",
    uploadImage: "Upload image",
    imageTooLarge: "Image too large (max 10MB)",
    placeholder: "Ask about any astronomy topic...",
    shiftEnterHint: "Shift + Enter for new line",
    agentsActive: "5 agents active",
  },
  landing: {
    nav: {
      features: "Features",
      demo: "Demo",
      pricing: "Pricing",
      faq: "FAQ",
      getStarted: "Get Started",
    },
    hero: {
      tag: "Multi-Agent AI Platform",
      title: "Your AI Research Team",
      titleAccent: "for the Universe",
      subtitle: "Specialized AI that searches, analyzes, and synthesizes astronomy research — so you can focus on discovery.",
      cta1: "Explore Now",
      cta2: "See How It Works",
      socialProof: "Trusted by 2,000+ researchers",
    },
    features: {
      eyebrow: "Specialized Intelligence",
      title: "Four Agents. One Mission.",
      subtitle: "Each agent masters a different domain, collaborating seamlessly for better results.",
      learnMore: "Learn more →",
    },
    agents: {
      search: {
        name: "Search Agent",
        role: "Search & Research",
        desc: "Search arXiv, NASA ADS, and SIMBAD. Results ranked by relevance in seconds.",
        mockLines: [
          { type: "query", text: 'Searching: "Betelgeuse mass loss rate 2024-2026"' },
          { type: "result", text: "→ Found 47 papers on arXiv, ADS and NASA ADS" },
          { type: "result", text: "→ Top result: Harper et al. (2025) — Ṁ ≈ 1.2×10⁻⁶ M☉/yr" },
          { type: "result", text: "→ Cross-referenced with VLT/SPHERE imaging data" },
          { type: "status", text: "✓ Results ranked by relevance and citation count" },
        ],
      },
      notebook: {
        name: "Notebook Agent",
        role: "Document Analysis",
        desc: "Upload PDFs, CSVs, or FITS files. Automatically extract and compare with published research.",
        mockLines: [
          { type: "upload", text: "📄 Uploaded: europa_spectroscopy_2025.pdf" },
          { type: "result", text: "→ Extracted 14 data tables, 8 spectral charts" },
          { type: "result", text: "→ Key finding: NaCl absorption confirmed at 2.07μm" },
          { type: "result", text: "→ Compared with Trumbo et al. (2023) — signal 34% stronger" },
          { type: "status", text: "✓ Structured summary ready for export" },
        ],
      },
      image: {
        name: "Image Agent",
        role: "Astronomical Image Analysis",
        desc: "Identify celestial objects and analyze galaxy morphology using a CNN Galaxy Zoo model.",
        mockLines: [
          { type: "upload", text: "🔭 Uploaded: ngc1300_hst.fits" },
          { type: "result", text: "→ Identified: Barred spiral galaxy (SBb)" },
          { type: "result", text: "→ CNN Galaxy Zoo: central bar detected — 94% confidence" },
          { type: "result", text: "→ Estimated distance: ~61 Mpc · z ≈ 0.0185" },
          { type: "status", text: "✓ Morphology analysis complete · Ready for deeper search" },
        ],
      },
      report: {
        name: "Report Agent",
        role: "Report Generation",
        desc: "Compile research into structured reports with citations and publication-ready formatting.",
        mockLines: [
          { type: "status", text: '⏳ Generating report: "Europa Habitability Assessment"' },
          { type: "result", text: "→ §1 Introduction — Ocean properties & context" },
          { type: "result", text: "→ §2 Tidal heating model — Energy budget analysis" },
          { type: "result", text: "→ §3 Surface composition — Spectroscopic evidence" },
          { type: "result", text: "→ References: 23 sources · LaTeX + PDF export ready" },
          { type: "status", text: "✓ Report complete — 4,200 words" },
        ],
      },
    },
    howItWorks: {
      eyebrow: "How It Works",
      title: "From Question to Discovery",
    },
    steps: [
      {
        num: "01",
        title: "Ask or Upload",
        desc: "Enter a question or upload a document — papers, observation logs, FITS headers, anything.",
      },
      {
        num: "02",
        title: "Agents Collaborate",
        desc: "Agents search, extract, and synthesize in parallel.",
      },
      {
        num: "03",
        title: "Receive Results",
        desc: "Structured answers, data comparisons, and reports with full citations.",
      },
    ],
    pricing: {
      eyebrow: "Pricing",
      title: "Simple, Transparent Pricing",
      subtitle: "Start for free. Upgrade when ready.",
      popular: "Popular",
    },
    plans: [
      {
        name: "Starter",
        price: "Free",
        period: "",
        desc: "Ideal for exploring astronomy topics",
        features: ["50 queries / month", "Basic Chat Agent", "5 document uploads", "Community support"],
        cta: "Get Started",
        highlight: false,
      },
      {
        name: "Pro",
        price: "$19",
        period: "/month",
        desc: "For serious researchers and students",
        features: ["Unlimited queries", "All 4 specialized agents", "100 docs / month", "Research report generation", "Priority processing", "Email support"],
        cta: "Start Free Trial",
        highlight: true,
      },
      {
        name: "Team",
        price: "$49",
        period: "/user/month",
        desc: "For labs and research groups",
        features: ["All Pro features", "Shared research library", "Team collaboration", "API access", "Custom integrations", "Dedicated support"],
        cta: "Contact Sales",
        highlight: false,
      },
    ],
    faq: { eyebrow: "FAQ", title: "Frequently Asked Questions" },
    faqItems: [
      {
        q: "What research areas does Astro Mind support?",
        a: "Stellar astrophysics, exoplanet detection, cosmology, solar system science — accessing NASA ADS, arXiv, SIMBAD, and the Exoplanet Archive.",
      },
      {
        q: "How accurate are the AI answers?",
        a: "Every answer includes source citations and uncertainty flags. Use it as a research aid, not a peer-review replacement.",
      },
      {
        q: "Can I upload my own observational data?",
        a: "Yes. Notebook Agent accepts PDF, text, CSV, FITS, and common image formats, then compares with published research.",
      },
      {
        q: "Is my data secure?",
        a: "Files are encrypted in transit and at rest. Your data is never used for training. Team plan adds access controls and audit logs.",
      },
      {
        q: "Do I need astronomy knowledge?",
        a: "Not at all. The agent adapts from undergraduate introductions to PhD-level detail — just ask naturally.",
      },
      {
        q: "Can I export my research results?",
        a: "Pro and Team plans include PDF, LaTeX, BibTeX, and JSON export. Starter users can copy response text.",
      },
    ],
    newsletter: {
      title: "Join the Observatory",
      subtitle: "New features and notable astronomy discoveries, straight to your inbox.",
      placeholder: "you@university.edu",
      cta: "Subscribe",
      success: "✓ Subscribed. Welcome aboard!",
      nospam: "No spam. Unsubscribe anytime.",
    },
    footer: {
      tagline: "AI-powered astronomy research, for curious minds.",
      cols: [
        { title: "Product", links: ["Features", "Pricing", "Demo", "Changelog", "API Docs"] },
        { title: "Resources", links: ["Documentation", "Tutorials", "Blog", "Research Papers", "Status"] },
        { title: "Company", links: ["About", "Careers", "Contact", "Privacy", "Terms"] },
      ],
      copyright: "© 2026 Astro Mind. All rights reserved.",
    },
    demo: {
      sectionEyebrow: "Try Now",
      sectionTitle: "Watch Agents in Action",
      sectionSubtitle: "See how AI agents collaborate to answer a research question.",
      sessionTitle: "Astro Mind — Research Session",
      replay: "Replay",
      send: "Send",
      inputPlaceholder: "Ask about any astronomy topic...",
      searchingStatus: "Search Agent searching...",
      composingStatus: "Chat Agent composing answer...",
      replyPrefix: "Great question about",
      replySuffix: "In a full session, agents search databases, analyze papers, and synthesize cited answers. Sign up to try it!",
      userMsg: "What do we know about the possibility of life on Europa?",
      agentStatuses: [
        "Search Agent searching astronomy databases...",
        "Notebook Agent processing 12 relevant papers...",
        "Chat Agent composing answer...",
      ],
      assistantText: "Europa is a top candidate for extraterrestrial life. Here's what current research shows:",
      dataLabels: ["Subsurface ocean depth", "Ocean volume", "Surface temperature", "Key compounds"],
      dataValues: ["60 – 150 km", "2 – 3× Earth's oceans", "−160°C (equator)", "NaCl, MgSO₄, O₂"],
      sources: "Pappalardo et al. (2025), NASA Europa Clipper preliminary data, Trumbo & Brown (2024)",
    },
  },
  account: {
    tabs: { account: "Account", usage: "Usage", plan: "Plan" },
    fields: { email: "Email", displayName: "Display Name", role: "Role", status: "Status" },
    roleValues: { admin: "Admin", user: "User" },
    statusValues: { active: "Active", locked: "Locked" },
    logout: "Sign Out",
    changePassword: "Change Password",
    pwPlaceholders: { current: "Current password", newPw: "New password", confirm: "Confirm new" },
    pwSave: "Change Password",
    pwSaving: "Saving...",
    pwErrors: {
      required: "Please fill in all fields.",
      mismatch: "Passwords do not match.",
      tooShort: "New password must be at least 8 characters.",
      wrong: "Current password is incorrect.",
      success: "Password changed successfully.",
    },
    activityTitle: "Your Activity",
    loading: "Loading...",
    noActivity: "No activity in this period",
    noData: "No data yet",
    estimatedCost: "Estimated Cost",
    costNote: "Est. $1.50/1M tokens (blended rate)",
    tokensThisMonth: "Tokens this month",
    plan: {
      currentBadge: "CURRENT",
      contactUpgrade: "Contact to Upgrade",
      noteOptional: "Note (optional)",
      send: "Send",
      sending: "Sending...",
      cancel: "Cancel",
      contactError: "Failed to send. Please try again.",
      contactSuccess: "Request sent! An admin will contact you soon.",
      upgradeNote: 'Click "Contact to Upgrade" and an admin will process your request.',
    },
    planInfo: {
      free: ["50K tokens/month", "50 req/day", "3 documents"],
      pro: ["500K tokens/month", "200 req/day", "20 documents"],
      team: ["Unlimited", "Unlimited", "Unlimited"],
    },
  },
  reportViewer: {
    loading: "Loading…",
    error: "Failed to load report",
    typeResearch: "Research",
    typeTrending: "Trending Report",
    typeDiscovery: "Discovery Report",
    headerBadge: "◈ ASTRO MIND · RESEARCH REPORT",
    exportPdf: "Export PDF",
    sectionContent: "Content",
    discoveryBadge: "◈ DETAILED ANALYSIS",
    discoveryTitle: "Celestial Object Analysis",
    morphologyNote: "✓ Morphology analyzed with CNN model (Galaxy Zoo).",
    quantBadge: "◈ QUANTITATIVE DATA",
    topicsLabel: "Research Topics (arXiv)",
    timelineLabel: "Discovery Timeline",
    interestLabel: "Public Interest",
    authorsLabel: "Top Authors",
    refBadge: "◈ REFERENCES",
    refTitle: "References",
    footerPrefix: "Generated by AstroMind AI",
    footerUpdated: "Data updated to",
    footerSources: "Sources",
    dateLocale: "en-US",
  },
  messageBody: {
    images: "Images",
    citations: "Citations",
    papers: "Papers",
    webSources: "Web sources",
    page: "Page",
    fromAnalysis: "From deep analysis",
    generatingReport: "Generating report...",
    openReport: "Open report →",
    createDiscovery: "✨ Create discovery report from this session",
    errorRateLimit: "Usage limit reached. Please try again later or upgrade your plan.",
    errorServer: "Error: could not reach server",
  },
};

const ja: Dict = {
  common: {
    delete: "削除",
    save: "保存",
    cancel: "キャンセル",
  },
  sidebar: {
    newChat: "新しい会話",
    collapse: "サイドバーを閉じる",
    expand: "サイドバーを開く",
    tabs: { chats: "会話", docs: "ドキュメント", reports: "レポート" },
    searchChats: "会話を検索...",
    searchReports: "レポートを検索...",
    noReports: "レポートなし。@report を使ってください。",
    noResultsFor: "検索結果なし:",
    accountUsage: "アカウント・使用状況",
    plan: { free: "フリープラン", pro: "プロプラン", team: "チームプラン" },
    language: "言語",
    reportTypes: { research: "研究", trending: "トレンド", discovery: "発見" },
    dateLabels: { today: "今日", yesterday: "昨日" },
  },
  chat: {
    analyzing: "リクエストを分析中",
    synthesizing: "回答を統合中",
    processing: "処理中",
    processingEllipsis: "処理中…",
    searchMulti: "マルチソース検索",
    searchArxiv: "arXiv論文を検索",
    searchNasaImages: "NASA画像を検索",
    searchApod: "APODを検索",
    searchWeb: "ウェブを検索",
    searchGeneric: "情報を検索",
    searchSources: "検索中",
    analyzeDoc: "ユーザードキュメントを分析",
    generateReport: "レポートを生成",
    analyzeImage: "画像を解析",
    thinkingHeader: "処理中 · {n} ステップ",
    welcomeTitle: "宇宙について何でも聞いてみよう",
    welcomeSubtitle: "専門AIエージェントで検索・分析・レポートを。",
    agentDescs: {
      search: "NASA · arXiv を検索",
      notebook: "ドキュメント分析",
      image: "天文画像解析",
      report: "トレンドレポート",
    },
  },
  inputBar: {
    addDocsContext: "ドキュメントをコンテキストに追加",
    noDocuments: "ドキュメントがありません",
    attachImage: "画像を添付",
    uploadImage: "画像をアップロード",
    imageTooLarge: "画像が大きすぎます（最大10MB）",
    placeholder: "天文学に関する質問を入力...",
    shiftEnterHint: "Shift + Enter で改行",
    agentsActive: "5つのエージェントが稼働中",
  },
  landing: {
    nav: {
      features: "機能",
      demo: "デモ",
      pricing: "料金",
      faq: "よくある質問",
      getStarted: "今すぐ始める",
    },
    hero: {
      tag: "マルチエージェント AI プラットフォーム",
      title: "あなたの宇宙研究を支える",
      titleAccent: "AI チーム",
      subtitle: "専門AIが天文学研究を検索・分析・統合します — あなたは探索に集中できます。",
      cta1: "今すぐ探索する",
      cta2: "仕組みを見る",
      socialProof: "2,000人以上の研究者が利用中",
    },
    features: {
      eyebrow: "専門的な知性",
      title: "4つのエージェント。1つのミッション。",
      subtitle: "各エージェントが異なる専門領域を担当し、シームレスに連携します。",
      learnMore: "詳しく見る →",
    },
    agents: {
      search: {
        name: "Search Agent",
        role: "検索・調査",
        desc: "arXiv、NASA ADS、SIMBADを横断検索。関連性順に数秒で結果を返します。",
        mockLines: [
          { type: "query", text: '検索中: "Betelgeuse mass loss rate 2024-2026"' },
          { type: "result", text: "→ arXiv、ADS、NASA ADSで47件の論文を発見" },
          { type: "result", text: "→ 最適な結果: Harper et al. (2025) — Ṁ ≈ 1.2×10⁻⁶ M☉/yr" },
          { type: "result", text: "→ VLT/SPHEREの画像データと照合済み" },
          { type: "status", text: "✓ 関連性と引用数でランク付け完了" },
        ],
      },
      notebook: {
        name: "Notebook Agent",
        role: "ドキュメント分析",
        desc: "PDF、CSV、FITSをアップロードするとデータを自動抽出・比較します。",
        mockLines: [
          { type: "upload", text: "📄 アップロード完了: europa_spectroscopy_2025.pdf" },
          { type: "result", text: "→ データ表14件、スペクトルグラフ8件を抽出" },
          { type: "result", text: "→ 主要結果: 2.07μmでNaCl吸収を確認" },
          { type: "result", text: "→ Trumbo et al. (2023)と比較 — 34%強いシグナル" },
          { type: "status", text: "✓ 構造化サマリーのエクスポート準備完了" },
        ],
      },
      image: {
        name: "Image Agent",
        role: "天文画像解析",
        desc: "天体を識別し、CNN Galaxy Zooモデルで銀河形態を解析します。",
        mockLines: [
          { type: "upload", text: "🔭 アップロード完了: ngc1300_hst.fits" },
          { type: "result", text: "→ 識別結果: 棒渦巻銀河 (SBb)" },
          { type: "result", text: "→ CNN Galaxy Zoo: 中心バー検出 — 信頼度 94%" },
          { type: "result", text: "→ 推定距離: ~61 Mpc · z ≈ 0.0185" },
          { type: "status", text: "✓ 形態解析完了 · さらなる検索の準備完了" },
        ],
      },
      report: {
        name: "Report Agent",
        role: "レポート作成",
        desc: "研究内容を引用付きの構造化レポートに自動まとめ、出版可能な形式で出力します。",
        mockLines: [
          { type: "status", text: '⏳ レポート作成中: "Europaの居住可能性の評価"' },
          { type: "result", text: "→ §1 序論 — 海洋特性と背景" },
          { type: "result", text: "→ §2 潮汐熱モデル — エネルギー収支分析" },
          { type: "result", text: "→ §3 表面組成 — 分光学的証拠" },
          { type: "result", text: "→ 参考文献: 23件 · LaTeX + PDF出力準備完了" },
          { type: "status", text: "✓ レポート完了 — 4,200語" },
        ],
      },
    },
    howItWorks: {
      eyebrow: "仕組み",
      title: "質問から発見へ",
    },
    steps: [
      {
        num: "01",
        title: "質問またはアップロード",
        desc: "質問を入力するか、論文・観測ログ・FITSなどをアップロードしてください。",
      },
      {
        num: "02",
        title: "エージェントが連携",
        desc: "エージェントが並行して検索・抽出・統合します。",
      },
      {
        num: "03",
        title: "結果を受け取る",
        desc: "引用付きの構造化された回答、データ比較、レポートを受け取ります。",
      },
    ],
    pricing: {
      eyebrow: "料金プラン",
      title: "シンプルで透明な料金",
      subtitle: "無料でスタート。準備ができたらアップグレード。",
      popular: "人気",
    },
    plans: [
      {
        name: "Starter",
        price: "無料",
        period: "",
        desc: "天文学のトピックを探索するのに最適",
        features: ["月50クエリ", "基本的なChat Agent", "5件のドキュメント", "コミュニティサポート"],
        cta: "始める",
        highlight: false,
      },
      {
        name: "Pro",
        price: "$19",
        period: "/月",
        desc: "本格的な研究者・学生向け",
        features: ["無制限クエリ", "4つの専門エージェント", "月100件のドキュメント", "研究レポート作成", "優先処理", "メールサポート"],
        cta: "無料で試す",
        highlight: true,
      },
      {
        name: "Team",
        price: "$49",
        period: "/人/月",
        desc: "研究室・研究グループ向け",
        features: ["Proの全機能", "共有リサーチライブラリ", "チームコラボレーション", "APIアクセス", "カスタム統合", "専任サポート"],
        cta: "購入相談",
        highlight: false,
      },
    ],
    faq: { eyebrow: "FAQ", title: "よくある質問" },
    faqItems: [
      {
        q: "どのような研究をサポートしていますか？",
        a: "恒星物理学、系外惑星、宇宙論、惑星科学 — NASA ADS、arXiv、SIMBAD、Exoplanet Archiveにアクセスします。",
      },
      {
        q: "AIの回答は正確ですか？",
        a: "各回答には出典引用と不確実性の明示があります。研究補助ツールとして活用してください。",
      },
      {
        q: "観測データをアップロードできますか？",
        a: "はい。PDF、テキスト、CSV、FITS、画像形式に対応し、公開済み研究と比較できます。",
      },
      {
        q: "データは安全ですか？",
        a: "ファイルは転送・保存時に暗号化されます。データはモデル学習に使用しません。チームプランはアクセス制御付き。",
      },
      {
        q: "天文学の知識がなくても使えますか？",
        a: "はい。学部入門から博士レベルまで、あなたのレベルに合わせて調整します。",
      },
      {
        q: "研究結果をエクスポートできますか？",
        a: "ProとTeamはPDF、LaTeX、BibTeX、JSONに対応。Starterはテキストコピーが可能です。",
      },
    ],
    newsletter: {
      title: "観測所に参加する",
      subtitle: "新機能と天文学の最新発見をお届けします。",
      placeholder: "you@university.edu",
      cta: "登録する",
      success: "✓ 登録完了。ようこそ！",
      nospam: "スパムなし。いつでも登録解除できます。",
    },
    footer: {
      tagline: "AIが支援する天文学研究ツール。",
      cols: [
        { title: "プロダクト", links: ["機能", "料金プラン", "デモ", "変更履歴", "API ドキュメント"] },
        { title: "リソース", links: ["ドキュメント", "チュートリアル", "ブログ", "研究論文", "ステータス"] },
        { title: "会社情報", links: ["私たちについて", "採用情報", "お問い合わせ", "プライバシー", "利用規約"] },
      ],
      copyright: "© 2026 Astro Mind. 全著作権所有。",
    },
    demo: {
      sectionEyebrow: "試してみる",
      sectionTitle: "エージェントの動きを見る",
      sectionSubtitle: "AIエージェントが連携して研究質問に答える様子をご覧ください。",
      sessionTitle: "Astro Mind — 研究セッション",
      replay: "再生",
      send: "送信",
      inputPlaceholder: "天文学に関する質問を入力...",
      searchingStatus: "Search Agentが検索中...",
      composingStatus: "Chat Agentが回答を作成中...",
      replyPrefix: "素晴らしい質問です：",
      replySuffix: "完全なセッションでは、エージェントが検索・分析・統合を行い、引用付きで回答します。登録してお試しください！",
      userMsg: "Europaに生命が存在する可能性について何が分かっていますか？",
      agentStatuses: [
        "Search Agentが天文データベースを検索中...",
        "Notebook Agentが関連論文12件を処理中...",
        "Chat Agentが回答を作成中...",
      ],
      assistantText: "Europaは地球外生命の最有力候補の1つです。現在の研究では：",
      dataLabels: ["地下海の深さ", "海洋体積", "表面温度", "主要成分"],
      dataValues: ["60 – 150 km", "地球の海洋の2〜3倍", "−160°C（赤道）", "NaCl, MgSO₄, O₂"],
      sources: "Pappalardo et al. (2025), NASA Europa Clipper preliminary data, Trumbo & Brown (2024)",
    },
  },
  account: {
    tabs: { account: "アカウント", usage: "使用状況", plan: "プラン" },
    fields: { email: "メール", displayName: "表示名", role: "ロール", status: "ステータス" },
    roleValues: { admin: "管理者", user: "ユーザー" },
    statusValues: { active: "有効", locked: "停止中" },
    logout: "ログアウト",
    changePassword: "パスワード変更",
    pwPlaceholders: { current: "現在のパスワード", newPw: "新しいパスワード", confirm: "確認用パスワード" },
    pwSave: "パスワードを変更",
    pwSaving: "保存中...",
    pwErrors: {
      required: "すべての項目を入力してください。",
      mismatch: "新しいパスワードが一致しません。",
      tooShort: "新しいパスワードは8文字以上にしてください。",
      wrong: "現在のパスワードが正しくありません。",
      success: "パスワードを変更しました。",
    },
    activityTitle: "アクティビティ",
    loading: "読み込み中...",
    noActivity: "この期間にアクティビティはありません",
    noData: "データがありません",
    estimatedCost: "推定コスト",
    costNote: "推定 $1.50/100万トークン（ブレンドレート）",
    tokensThisMonth: "今月のトークン数",
    plan: {
      currentBadge: "利用中",
      contactUpgrade: "アップグレードを相談",
      noteOptional: "メモ（任意）",
      send: "送信",
      sending: "送信中...",
      cancel: "キャンセル",
      contactError: "送信に失敗しました。もう一度お試しください。",
      contactSuccess: "リクエストを送信しました！管理者からご連絡いたします。",
      upgradeNote: '「アップグレードを相談」をクリックすると管理者が処理します。',
    },
    planInfo: {
      free: ["50Kトークン/月", "50リクエスト/日", "3ドキュメント"],
      pro: ["500Kトークン/月", "200リクエスト/日", "20ドキュメント"],
      team: ["無制限", "無制限", "無制限"],
    },
  },
  reportViewer: {
    loading: "読み込み中…",
    error: "レポートを読み込めません",
    typeResearch: "詳細研究",
    typeTrending: "トレンドレポート",
    typeDiscovery: "探索レポート",
    headerBadge: "◈ ASTRO MIND · 研究レポート",
    exportPdf: "PDFエクスポート",
    sectionContent: "コンテンツ",
    discoveryBadge: "◈ 詳細分析",
    discoveryTitle: "天体詳細分析",
    morphologyNote: "✓ CNNモデル（Galaxy Zoo）で形態を分析。",
    quantBadge: "◈ 定量データ",
    topicsLabel: "研究トピック（arXiv）",
    timelineLabel: "発見タイムライン",
    interestLabel: "公共の関心",
    authorsLabel: "主要著者",
    refBadge: "◈ 参考文献",
    refTitle: "参考文献",
    footerPrefix: "Generated by AstroMind AI",
    footerUpdated: "データ更新日",
    footerSources: "データソース",
    dateLocale: "ja-JP",
  },
  messageBody: {
    images: "画像",
    citations: "引用",
    papers: "論文",
    webSources: "Webソース",
    page: "ページ",
    fromAnalysis: "詳細分析より",
    generatingReport: "レポート生成中...",
    openReport: "レポートを開く →",
    createDiscovery: "✨ このセッションから探索レポートを作成",
    errorRateLimit: "利用制限に達しました。後でもう一度お試しいただくか、プランをアップグレードしてください。",
    errorServer: "エラー: サーバーに接続できませんでした",
  },
};

export const dictionaries: Record<Locale, Dict> = { vi, en, ja };
