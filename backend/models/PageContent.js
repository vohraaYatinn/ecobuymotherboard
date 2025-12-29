import mongoose from "mongoose"

const sectionSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
})

const pageContentSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: ["terms-and-conditions", "shipping-policy", "privacy-policy", "return-policy"],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sections: [sectionSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
pageContentSchema.index({ slug: 1 })
pageContentSchema.index({ isActive: 1 })

const PageContent = mongoose.model("PageContent", pageContentSchema)

export default PageContent

























