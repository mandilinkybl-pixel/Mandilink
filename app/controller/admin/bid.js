const SecureEmployee = require("../../models/adminEmployee");
const Bid = require("../../models/bidpost");

class AuctionController {

  // List all auctions
  async list(req,res){
    try{
      const {q, status, startDate, endDate} = req.query;
      const filter = {};

      if(q) filter.$or = [
        { commodityName: { $regex: q, $options: "i" } },
        { quality: { $regex: q, $options: "i" } }
      ];

      if(status) filter.status = status;

      if(startDate || endDate){
        filter.createdAt = {};
        if(startDate) filter.createdAt.$gte = new Date(startDate);
        if(endDate){ const d=new Date(endDate); d.setHours(23,59,59,999); filter.createdAt.$lte = d; }
      }

      let auctions = await Bid.find(filter).populate("createdBy").populate("bids.user").sort({createdAt:-1});

      for(const a of auctions){
        if(a.isExpired && a.status==="active"){ a.status="completed"; await a.save(); }
      }

      auctions = await Bid.find(filter).populate("createdBy").populate("bids.user").sort({createdAt:-1});

      const auctionsData = auctions.map(a=>{
        const winner = a.bids?.length ? a.bids.reduce((max,b)=>b.amount>(max?.amount||-Infinity)?b:max,null):null;
        return {auction: a, winner};
      });

      const user= req.user;
      const userdetails =await SecureEmployee.findById(req.user.id)


      res.render("admin/bidlist",{
        user,
        userdetails,
        auctionsData,
        csrfToken: req.csrfToken ? req.csrfToken() : null,
        q:q||"", status:status||"", startDate:startDate||"", endDate:endDate||"",
        success_msg: req.flash?.("success_msg"),
        error_msg: req.flash?.("error_msg"),
      });

    }catch(err){ console.error(err); res.status(500).send("Server error"); }
  }

  // Create auction
  async create(req,res){
    try{
      const { commodityName, harvestTiming, quality, quantityAmount, quantityUnit, startingPrice, duration, createdByModel, createdById } = req.body;
      if(!["SecureEmployee","Company","LISTING"].includes(createdByModel)){
        req.flash("error_msg","Invalid creator type"); return res.redirect("/admin/auctions");
      }

      const newBid = new Bid({
        commodityName,
        harvestTiming,
        quality,
        quantity: { amount: quantityAmount, unit: quantityUnit },
        startingPrice,
        currentPrice: startingPrice,
        duration,
        createdBy: createdById || req.user._id,
        createdByModel,
        image: req.file ? "/uploads/"+req.file.filename : null,
      });

      await newBid.save();
      req.flash("success_msg","Auction created successfully");
      res.redirect("/admin/auctions");

    }catch(err){ console.error(err); req.flash("error_msg","Error creating auction"); res.redirect("/admin/auctions"); }
  }

  // Update auction
  async update(req,res){
    try{
      const { commodityName, harvestTiming, quality, quantityAmount, quantityUnit, startingPrice, duration } = req.body;
      await Bid.findByIdAndUpdate(req.params.id,{
        commodityName, harvestTiming, quality,
        quantity:{ amount: quantityAmount, unit: quantityUnit },
        startingPrice, duration,
        image:req.file ? "/uploads/"+req.file.filename : undefined
      });
      req.flash("success_msg","Auction updated successfully");
      res.redirect("/admin/auctions");
    }catch(err){ console.error(err); req.flash("error_msg","Error updating auction"); res.redirect("/admin/auctions"); }
  }

  // Delete auction
  async delete(req,res){
    try{ await Bid.findByIdAndDelete(req.params.id); req.flash("success_msg","Auction deleted"); res.redirect("/admin/auctions"); }
    catch(err){ console.error(err); req.flash("error_msg","Error deleting auction"); res.redirect("/admin/auctions"); }
  }

  // Delete by duration
  async deleteByDuration(req,res){
    try{
      const { hours } = req.body;
      await Bid.deleteMany({ duration:{ $lte:Number(hours) }});
      req.flash("success_msg",`Auctions with duration <= ${hours}h deleted`);
      res.redirect("/admin/auctions");
    }catch(err){ console.error(err); req.flash("error_msg","Error deleting by duration"); res.redirect("/admin/auctions"); }
  }

  // Delete by date
  async deleteByDate(req,res){
    try{
      const { startDate,endDate } = req.body;
      const filter = {};
      if(startDate||endDate){ filter.createdAt={}; if(startDate) filter.createdAt.$gte=new Date(startDate); if(endDate){ const d=new Date(endDate); d.setHours(23,59,59,999); filter.createdAt.$lte=d; } }
      await Bid.deleteMany(filter);
      req.flash("success_msg","Auctions deleted by date");
      res.redirect("/admin/auctions");
    }catch(err){ console.error(err); req.flash("error_msg","Error deleting by date"); res.redirect("/admin/auctions"); }
  }

  // Bid on auction
  async placeBid(req,res){
    try{
      const { auctionId, amount, userModel } = req.body;
      const auction = await Bid.findById(auctionId);
      if(!auction || auction.status!=="active"){ req.flash("error_msg","Auction not active"); return res.redirect("/admin/auctions"); }

      if(amount<=auction.currentPrice){ req.flash("error_msg","Bid must be higher than current price"); return res.redirect("/admin/auctions"); }

      auction.bids.push({ user:req.user._id, userModel, amount });
      auction.currentPrice = amount;
      await auction.save();

      req.flash("success_msg","Bid placed successfully");
      res.redirect("/admin/auctions");

    }catch(err){ console.error(err); req.flash("error_msg","Error placing bid"); res.redirect("/admin/auctions"); }
  }

}

module.exports = new AuctionController();
