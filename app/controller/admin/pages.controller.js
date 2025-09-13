

const SecureEmployee = require("../../models/adminEmployee");
const Sechueemploueeschema=require("../../models/adminEmployee");
const BlogPost = require("../../models/blog");
const categoryModel = require("../../models/category.model");
const commodityname = require("../../models/commodityname");
const Job = require("../../models/job");
const mandirates = require("../../models/mandirates");
const plan = require("../../models/plan");
const Subrole = require("../../models/subrole");
const Ad = require("../../models/topads");
class PagesController {
    async index(req, res) {

        const user = req.user; // Access user data from middleware
       

        const userdetails = await Sechueemploueeschema.findById(user.id);
        //  console.log("User data:", user,userdetails);
        res.render('admin/index', { user, userdetails });
    }
    login(req, res) {
        res.render('admin/login')
    }
   async createEmployee(req, res) {
            const user = req.user; // Access user data from middleware
       

        const userdetails = await Sechueemploueeschema.findById(user.id);
        res.render('admin/EmployeeCreate', { user, userdetails });
    }
     async getAllEmployees(req, res) {
           const user = req.user; // Access user data from middleware
       

        const userdetails = await Sechueemploueeschema.findById(user.id);
                const employees = await Sechueemploueeschema.find({ role: "employee" });
                res.render('admin/EmployeeTable', { employees, user, userdetails });

        }
          // 🔹 Get Single Employee
    async getEmployeeById(req, res) {
            const user = req.user; // Access user data from middleware
       

        const userdetails = await Sechueemploueeschema.findById(user.id);
            const { id } = req.params;
            const employee = await Sechueemploueeschema.findById(id);
            if (!employee) return res.status(404).json({ message: "Employee not found" });
            res.render('admin/editemployee', { employee, user, userdetails });
        }


        async getAllBlogs(req, res) {
  try {
    const user = req.user; // Current logged-in user
    const userdetails = await SecureEmployee.findById(user.id);

    // Fetch blogs with author and category populated
    const blogs = await BlogPost.find()
      .populate({ path: "author_doc", select: "name email" })
      .populate({ path: "category", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch active categories for dropdown
    const categories = await categoryModel.find({ status: "active" }).lean();

    // Render EJS with blogs + categories
    res.render("admin/blogs", {
      count: blogs.length,
      blogs,
      categories,
      user,
      userdetails,
      message: req.query.message,
      error: req.query.error,
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ message: "Error fetching blogs", error: error.message });
  }
}

          async getBlogById(req, res) {
            const { id } = req.params;
            try {
              const user = req.user; // Access user data from middleware
              const userdetails = await Sechueemploueeschema.findById(user.id);
              const blog = await BlogPost.findById(id)
                .populate("author_doc", "name email");
              if (!blog) return res.status(404).json({ message: "Blog not found" });
              res.render('admin/blogDetail', { blog, user, userdetails });
            } catch (error) {
              res.status(500).json({ message: "Error fetching blog", error: error.message });
            }
          }
          async createblog(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);

            const categories = await categoryModel.find({ status: "active" }).lean();

            res.render('admin/blogpost', { user, userdetails,categories  });
          }

          async rolecreate(req, res) {
            const user = req.user; // Access user data from middleware
              const search = req.query.search || "";
                  const query = search
                    ? { name: { $regex: search, $options: "i" } }
                    : {};
            
                  const subroles = await Subrole.find(query).sort({ createdAt: -1 });
            const userdetails = await Sechueemploueeschema.findById(user.id);
            res.render('admin/rolecreate', { user, userdetails, subroles, search });
          }

          
          async totalusers(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const totalUsers = await Sechueemploueeschema.countDocuments();
            res.render('admin/totalusers', { user, userdetails, totalUsers });
          }


          async getAllJobs(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const jobs = await Job.find().populate("postedBy", "name email");
            res.render('admin/jobtable', { jobs, user, userdetails });
          }
          async createJob(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            res.render('admin/createJob', { user, userdetails });
          }
          async editJob(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const { id } = req.params;
            const job = await Job.findById(id);
            if (!job) return res.status(404).json({ message: "Job not found" });
            res.render('admin/updateJob', { job, user, userdetails });
          }

          async adsPage(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            res.render('admin/adscreate', { user, userdetails });
          }

          async topAds(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Top" }).populate("createdBy", "name")
            res.render('admin/topads', { user, userdetails, ads });
          }
          async sponsoredAds(req, res) {
            const user = req.user;

            const userdetails = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Sponsored" }).populate("createdBy", "name")
            res.render('admin/sponsoredads', { user, userdetails, ads });
          }
          async bottomAds(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Bottom" }).populate("createdBy", "name")
            res.render('admin/bottomads', { user, userdetails, ads });
          }
          async sideAds(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Side" }).populate("createdBy", "name");
            res.render('admin/sideads', { user, userdetails, ads });
          }
          async plans(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);

            const plans = await plan.find().populate("allowedSubroles");
            const subroles = await Subrole.find();
            res.render('admin/plans', { user, userdetails, plans, subroles });
          }
         
          async getAllCommodities(req, res) {
            const commodities = await commodityname.find().sort({ createdAt: -1 }).lean();
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            res.render('admin/comidities', { commodities, user, userdetails });
          }
          // Example controller
async getCommodity(req, res) {
  const commodity = await commodityname.findById(req.params.id);
  if(!commodity) return res.json({ success: false, message: "Commodity not found" });
  res.json({ success: true, data: commodity });
}

// mandiprice setup
async mandiprice(req, res) {
  const user = req.user;
  const userdetails = await Sechueemploueeschema.findById(user.id);

 const mandis = await mandirates.find()
        .populate("commodityPrices.commodity", "commodityName")
        .sort({ createdAt: -1 })
        .lean();

      const allCommodities = await commodityname.find({ status: "active" }).lean();

  res.render('admin/mandiprice', { user, userdetails, mandis, allCommodities });
}


        }

module.exports = new PagesController();