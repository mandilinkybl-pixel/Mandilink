const mongoose = require("mongoose");

const secureEmployeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },

    role: {
        type: String,
        enum: ["admin", "employee"],
        default: "employee"
    },

    access: [{
        type: String,
        enum: [
            "Manage_Users",
            "Manage_Roles",
            "Manage_Admin",
            "Manage_CallLogs",
            "Manage_SupportTickets",
            "Manage_Reports",
            "Manage_Settings",
            "Manage_Ads_Top",
            "Manage_Ads_Bottom",
            "Manage_Ads_Side",
            "Manage_Ads_Sponsored",
            "Manage_Jobs",
            "Manage_Blogs",
            "Manage_Analytics",
            "Manage_MandiRates",        // 🌾 New
            "Manage_PushNotifications", // 🔔 New
            "Manage_Plans",             // 💳 New
            "Manage_Payments"           // 💰 New

        ]
    }],

    isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

const SecureEmployee = mongoose.model("SecureEmployee", secureEmployeeSchema);
module.exports = SecureEmployee;
