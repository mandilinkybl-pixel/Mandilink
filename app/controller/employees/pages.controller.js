
const Sechueemploueeschema = require("../../models/adminEmployee");
const Job = require("../../models/job");
const plan = require("../../models/plan");
const subrole = require("../../models/subrole");
const Ad = require("../../models/topads");
const BlogPost = require("../../models/blog");
const commodityname = require("../../models/commodityname");

class PagesController {

   async index(req, res) {

    const user = req.user; // Access user data from middleware
    // console.log("User data in employee page controller:", user);
    const employee = await Sechueemploueeschema.findById(user.id);

    // console.log("Employee data in employee page controller:", employee); 
    res.render('employees/index', { user, employee });
    }
    login(req, res) {
        res.render('employees/login');
    }
            async getAllBlogs(req, res) {
            try {

                const user = req.user; // Access user data from middleware
               const userdetails = await Sechueemploueeschema.findById(user.id);
             const blogs = await BlogPost.find().populate({ path: 'author_doc',select: 'name email'})
  .sort({ createdAt: -1 });
                // console.log(blogs)
                 const employee = await Sechueemploueeschema.findById(user.id);

              res.render('employees/blogs', { count: blogs.length, blogs, user, userdetails, employee });
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
               const employee = await Sechueemploueeschema.findById(user.id);
              const blog = await BlogPost.findById(id)
                .populate("author_doc", "name email");
              if (!blog) return res.status(404).json({ message: "Blog not found" });
              res.render('employees/blogDetail', { blog, user, userdetails });
            } catch (error) {
              res.status(500).json({ message: "Error fetching blog", error: error.message });
            }
          }
          async createblog(req, res) {
            const user = req.user; // Access user data from middleware

            const userdetails = await Sechueemploueeschema.findById(user.id);
            const employee = await Sechueemploueeschema.findById(user.id);
            res.render('employees/blogpost', { user, userdetails, employee });
          }

          async rolecreate(req, res) {
            const user = req.user; // Access user data from middleware
              const search = req.query.search || "";
                  const query = search
                    ? { name: { $regex: search, $options: "i" } }
                    : {};
            
                  const subroles = await subrole.find(query).sort({ createdAt: -1 });
      
                  const userdetails = await Sechueemploueeschema.findById(user.id);
                  const employee = await Sechueemploueeschema.findById(user.id);
            res.render('employees/rolecreate', { user, userdetails, subroles, search, employee });
          }

          
          async totalusers(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const totalUsers = await Sechueemploueeschema.countDocuments();
            const employee = await Sechueemploueeschema.findById(user.id);
            res.render('employees/totalusers', { user, userdetails, totalUsers, employee });
          }


          async getAllJobs(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const jobs = await Job.find().populate("postedBy", "name email");
            const employee = await Sechueemploueeschema.findById(user.id);
            res.render('employees/jobtable', { jobs, user, userdetails, employee });
          }
          async createJob(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const employee = await Sechueemploueeschema.findById(user.id);
            res.render('employees/createJob', { user, userdetails, employee });
          }
          async editJob(req, res) {
            const user = req.user; // Access user data from middleware
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const { id } = req.params;
            const job = await Job.findById(id);
                const employee = await Sechueemploueeschema.findById(user.id);
            if (!job) return res.status(404).json({ message: "Job not found" });
            res.render('employees/updateJob', { job, user, userdetails, employee });
          }

          async adsPage(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const employee = await Sechueemploueeschema.findById(user.id);
            res.render('employees/adscreate', { user, userdetails, employee });
          }

          async topAds(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const employee = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Top" }).populate("createdBy", "name")
            res.render('employees/topads', { user, userdetails, ads, employee });
          }
          async sponsoredAds(req, res) {
            const user = req.user;

            const userdetails = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Sponsored" }).populate("createdBy", "name")
            const employee = await Sechueemploueeschema.findById(user.id);
            res.render('employees/sponsoredads', { user, userdetails, ads, employee });
          }
          async bottomAds(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const employee = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Bottom" }).populate("createdBy", "name")
            res.render('employees/bottomads', { user, userdetails, ads, employee });
          }
          async sideAds(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const employee = await Sechueemploueeschema.findById(user.id);
            const ads = await Ad.find({ type: "Side" }).populate("createdBy", "name");
            res.render('employees/sideads', { user, userdetails, ads, employee });
          }
          async plans(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
            const employee = await Sechueemploueeschema.findById(user.id);
            const plans = await plan.find().populate("allowedsubroles");
            const subroles = await subrole.find();
            res.render('employees/plans', { user, userdetails, plans, subroles, employee });
          }
          async mandiprice(req, res) {
            const user = req.user;
            const userdetails = await Sechueemploueeschema.findById(user.id);
          
           const mandis = await mandirates.find()
                  .populate("commodityPrices.commodity", "commodityName")
                  .sort({ createdAt: -1 })
                  .lean();
           const employee = await Sechueemploueeschema.findById(user.id);
                const allCommodities = await commodityname.find({ status: "active" }).lean();

            res.render('employees/mandiprice', { user, userdetails, mandis, allCommodities, employee });
          }

           async getAllCommodities(req, res) {
                      const commodities = await commodityname.find().sort({ createdAt: -1 }).lean();
                      const user = req.user;
                      const userdetails = await Sechueemploueeschema.findById(user.id);
           const employee = await Sechueemploueeschema.findById(user.id);

                      res.render('employees/comidities', { commodities, user, userdetails, employee });
                    }
                    // Example controller
          async getCommodity(req, res) {
            const commodity = await commodityname.findById(req.params.id);
           const employee = await Sechueemploueeschema.findById(user.id);

            if(!commodity) return res.json({ success: false, message: "Commodity not found" });
            res.json({ success: true, data: commodity });
          }
}

module.exports = new PagesController();