import dotenv from "dotenv";
import mongoose from "mongoose";
import BlogModel from "./models/blogModel.js";

dotenv.config();

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const migrateBlogSlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const blogs = await BlogModel.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: "" },
      ],
    }).select("_id title slug");

    console.log(`Found ${blogs.length} blogs without slug`);

    for (const blog of blogs) {
      const baseSlug = generateSlug(blog.title);

      let slug = baseSlug;
      let count = 1;

      while (await BlogModel.exists({
        slug,
        _id: { $ne: blog._id },
      })) {
        slug = `${baseSlug}-${count}`;
        count++;
      }

      await BlogModel.updateOne(
        { _id: blog._id },
        { $set: { slug } }
      );

      console.log(`Updated: ${blog.title} => ${slug}`);
    }

    console.log("Blog slug migration completed");
  } catch (error) {
    console.error("Migration Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrateBlogSlugs();