ORCHESTRATOR_TOOLS = [
    {
        "name": "analyze_astronomy_image",
        "description": (
            "Phân tích ảnh thiên văn mà user đã gửi kèm bằng Claude Vision. "
            "Trả về danh sách thiên thể nhận dạng được (class, sub_type, confidence, description).\n"
            "QUAN TRỌNG: Gọi tool này TRƯỚC TIÊN khi user gửi kèm ảnh.\n"
            "Nếu có thiên thể được nhận ra → dùng call_search_agent để tìm thêm thông tin.\n"
            "Nếu không nhận ra thiên thể nào → hỏi user mô tả thêm về ảnh."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "Câu hỏi cụ thể của user về ảnh (tuỳ chọn)",
                }
            },
            "required": [],
        },
    },
    {
        "name": "call_search_agent",
        "description": (
            "Tìm kiếm thông tin thiên văn. Có thể chỉ định nguồn cụ thể qua tham số sources:\n"
            "- 'arxiv': tìm paper khoa học trên arXiv\n"
            "- 'apod': lấy ảnh thiên văn hàng ngày từ NASA APOD\n"
            "- 'images': tìm ảnh trong NASA Image Library\n"
            "- 'web': tìm kiếm thông tin trên Internet\n"
            "Nếu không có sources, tìm từ tất cả nguồn."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Từ khóa tìm kiếm. Dùng tiếng Anh để có kết quả tốt hơn từ arXiv và NASA.",
                },
                "sources": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["arxiv", "apod", "images", "web"],
                    },
                    "description": (
                        "Nguồn cần tìm. Rỗng = tất cả nguồn. "
                        "Dùng ['images'] khi user hỏi ảnh, ['arxiv'] khi tìm paper, "
                        "['web'] khi tìm tin tức. "
                        "Tránh dùng 'apod' khi user chỉ muốn tìm kiếm web/tin tức."
                    ),
                },
                "web_days": {
                    "type": "integer",
                    "description": (
                        "Giới hạn kết quả web theo số ngày gần nhất (chỉ áp dụng cho nguồn 'web'). "
                        "Mặc định 90 (3 tháng gần nhất) — phù hợp cho tin tức, sự kiện sắp tới. "
                        "Dùng web_days=0 khi user hỏi về thời điểm cụ thể trong quá khứ "
                        "(ví dụ: 'nhật thực năm 2017', 'sự kiện tháng 3 năm 2024') "
                        "để không giới hạn thời gian tìm kiếm."
                    ),
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "call_notebook_agent",
        "description": (
            "Truy vấn và tổng hợp thông tin từ tài liệu người dùng đã upload (PDF, DOCX, FITS, URL). "
            "Trả về câu trả lời với trích dẫn chính xác tới trang và đoạn văn cụ thể. "
            "Dùng khi cần thông tin từ tài liệu cụ thể của người dùng."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "Câu hỏi cần tìm trong tài liệu",
                },
                "doc_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Danh sách ID tài liệu cần truy vấn. Rỗng = tất cả tài liệu của user.",
                },
            },
            "required": ["question"],
        },
    },
    {
        "name": "call_report_agent",
        "description": (
            "Tạo báo cáo thiên văn chuyên nghiệp.\n"
            "Ba chế độ:\n"
            "- report_type='research' (mặc định): báo cáo nghiên cứu chuyên sâu, "
            "8 phần (tổng quan, hướng nghiên cứu, thành tựu, bảng tóm tắt thành tựu, "
            "phương pháp, thách thức, triển vọng, kết luận). "
            "Dùng khi user hỏi 'tạo báo cáo về X', 'tổng hợp về X'.\n"
            "- report_type='trending': báo cáo xu hướng + dữ liệu định lượng thực tế "
            "(số paper arXiv theo năm, mức quan tâm Google Trends, tác giả nổi bật). "
            "Dùng khi user hỏi 'xu hướng', 'trending', 'thống kê', 'hot topic'.\n"
            "- report_type='discovery': báo cáo tổng hợp những gì user đã khám phá "
            "trong phiên chat hiện tại (ảnh đã phân tích, tài liệu đã tra cứu, paper đã tìm). "
            "Dùng khi user hỏi 'tổng hợp những gì chúng ta đã tìm hiểu', 'báo cáo khám phá', "
            "'tóm tắt phiên này'. Không cần topic — hệ thống tự suy ra từ phiên."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": (
                        "Chủ đề báo cáo theo ngôn ngữ tự nhiên, "
                        "ví dụ: 'sóng hấp dẫn', 'exoplanet atmospheres', 'black hole imaging'. "
                        "Bắt buộc cho research/trending. Discovery có thể để trống — "
                        "hệ thống tự suy ra từ ảnh/đối tượng đã phân tích trong phiên."
                    ),
                },
                "report_type": {
                    "type": "string",
                    "enum": ["research", "trending", "discovery"],
                    "description": (
                        "'research' cho báo cáo nghiên cứu thuần túy. "
                        "'trending' khi user muốn xem xu hướng, thống kê, dữ liệu định lượng. "
                        "'discovery' khi user muốn tổng hợp/báo cáo từ phiên chat hiện tại."
                    ),
                },
                "doc_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Danh sách ID tài liệu user đã đính kèm để cá nhân hóa báo cáo "
                        "(liên hệ nội dung tài liệu vào báo cáo research/trending, hoặc "
                        "khi user muốn discovery report tập trung vào tài liệu cụ thể). "
                        "Rỗng = không cá nhân hóa."
                    ),
                },
            },
            "required": [],
        },
        "cache_control": {"type": "ephemeral"},
    },
]
