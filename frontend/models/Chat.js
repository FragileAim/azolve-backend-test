const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, trim: true, maxlength: 200 },
  type: { type: String, enum: ['private', 'group', 'project', 'support'], default: 'private' },
  description: { type: String, trim: true },
  avatar: { type: String, default: '' },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastRead: { type: Date, default: Date.now },
    muted: { type: Boolean, default: false },
  }],
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  lastMessage: {
    content: { type: String, trim: true },
    sender: { type: String, trim: true },
    timestamp: { type: Date },
  },
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

chatSchema.index({ company: 1, type: 1 });
chatSchema.index({ 'participants.user': 1 });

const messageSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, trim: true },
  content: { type: String, trim: true },
  type: { type: String, enum: ['text', 'image', 'file', 'audio', 'video', 'system'], default: 'text' },
  mediaUrl: { type: String },
  mediaName: { type: String, trim: true },
  mediaSize: { type: Number },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reactions: { type: Map, of: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: {} },
  readBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
  }],
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ company: 1, chat: 1 });

const Chat = mongoose.model('Chat', chatSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = { Chat, Message };