var mongoose = require("mongoose");

var youtubechannelSchema = new mongoose.Schema({
    title: String,
    url: String,
    imgURL: String,
    htmlbody : String,
    totalSubscribers: [
    {
      date: Date,
      value: Number
    }],
    subscriberGrowth:  [
    {
      date: Date,
      value: Number
    }],
    totalViews: [
    {
      date: Date,
      value: Number
    }],
    dailyViews: [
    {
      date: Date,
      value: Number
    }],
    
    created: { type: Date, default: Date.now }
});

module.exports =  mongoose.model("YoutubeChannel", youtubechannelSchema);