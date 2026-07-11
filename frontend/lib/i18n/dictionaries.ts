export type Locale = "vi" | "en";

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
    noReports: "Chưa có báo cáo nào. Gõ @report trong chat.",
    noResultsFor: "Không có kết quả cho",
    accountUsage: "Tài khoản & Mức sử dụng",
    plan: { free: "Gói Free", pro: "Gói Pro", team: "Gói Team" },
    language: "Ngôn ngữ",
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
};

export const dictionaries: Record<Locale, Dict> = { vi, en };
