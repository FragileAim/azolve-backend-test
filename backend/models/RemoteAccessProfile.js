const mongoose = require('mongoose');

const remoteAccessProfileSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  tool: {
    type: String,
    enum: ['anydesk', 'connectwise', 'teamviewer', 'chrome_remote_desktop', 'other'],
    required: true,
  },
  // What this means depends on `tool`:
  //   anydesk                -> the client's 9-10 digit AnyDesk ID
  //   teamviewer              -> the client's TeamViewer ID
  //   connectwise             -> the full session/access URL from their ConnectWise Control instance
  //   chrome_remote_desktop   -> the support session URL/code
  //   other                   -> free text (a link, an ID, instructions — whatever the tech needs)
  identifier: { type: String, required: true, trim: true, maxlength: 500 },
  contactForAccess: { type: String, trim: true, maxlength: 200 }, // who to call/message before connecting
  notes: { type: String, trim: true, maxlength: 1000 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

remoteAccessProfileSchema.index({ company: 1, client: 1 }, { unique: true });

module.exports = mongoose.model('RemoteAccessProfile', remoteAccessProfileSchema);
