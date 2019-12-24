import { Schema, model, Document } from 'mongoose'

const FriendSchema = new Schema({
  createTime: { type: Date, default: Date.now },

  from: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
})

interface FriendDocument extends Document {
  /** Database id */
  _id: Schema.Types.ObjectId
  /** Source user id */
  from: Schema.Types.ObjectId
  /** Target user id */
  to: Schema.Types.ObjectId
  /** Creation time */
  createTime: Date
}

/**
 * Friend Model
 * Buddy information
 * Friendship relationship is one-way
 */
const Friend = model<FriendDocument>('Friend', FriendSchema)

export default Friend
