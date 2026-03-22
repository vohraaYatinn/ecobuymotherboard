import mongoose from "mongoose"

const AVAILABLE_PERMISSIONS = [
  "dashboard:view",
  "orders:view",
  "orders:manage",
  "customers:view",
  "customers:manage",
  "vendors:view",
  "vendors:manage",
  "products:view",
  "products:manage",
  "categories:view",
  "categories:manage",
  "reports:view",
  "ledger:view",
  "learning-resources:view",
  "learning-resources:manage",
  "page-content:view",
  "page-content:manage",
  "push-notifications:manage",
  "notifications:view",
  "support:view",
  "support:manage",
  "settings:view",
  "settings:manage",
  "designations:view",
  "designations:manage",
  "employees:view",
  "employees:manage",
]

const designationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Designation name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: function (perms) {
          return perms.every((p) => AVAILABLE_PERMISSIONS.includes(p))
        },
        message: "Invalid permission value",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

designationSchema.statics.getAvailablePermissions = function () {
  return AVAILABLE_PERMISSIONS
}

const Designation = mongoose.model("Designation", designationSchema)

export default Designation
