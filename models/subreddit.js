var mongoose = require("mongoose");

var subredditSchema = new mongoose.Schema({
    title: String,
    url: String,
    subscriberGrowth:  [
    {
      date: Date,
      value: Number
    }],
    totalSubscribers: [
    {
      date: Date,
      value: Number
    }],
    rank: [
    {
      date: Date,
      value: Number
    }],
    

    created: { type: Date, default: Date.now }
});

module.exports =  mongoose.model("Subreddit", subredditSchema);