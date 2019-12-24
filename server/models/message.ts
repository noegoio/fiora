import { Schema, model, Document } from 'mongoose'

const MessageSchema = new Schema({
  createTime: { type: Date, default: Date.now, index: true },

  from: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  to: {
    type: String,
    index: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'code', 'invite', 'system'],
    default: 'text'
  },
  content: {
    type: String,
    default: ''
  }
})

interface MessageDocument extends Document {
  _id: Schema.Types.ObjectId
  from: Schema.Types.ObjectId
  to: string
  type: string
  content: string
  createTime: Date
}

const Message = model<MessageDocument>('Message', MessageSchema)

export default Message
