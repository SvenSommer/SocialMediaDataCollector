var mongoose = require("mongoose");

var subredditSchema = new mongoose.Schema({
    title: String,
    url: String,
    subscriberGrowth: [
    {
      date: Date,
      subscribers: Number
    }],
    totalSubscribers: [
    {
      date: Date,
      subscribers: Number
    }],
    dailySubscribers: [
    {
      date: Date,
      subscribers: Number
    }],
    rank: [
    {
      date: Date,
      rank: Number
    }],
    

    created: { type: Date, default: Date.now }
});

module.exports =  mongoose.model("Subreddit", subredditSchema);