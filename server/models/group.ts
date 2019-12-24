import { Schema, model, Document } from 'mongoose'
import { UserDocument } from './user'

const GroupSchema = new Schema({
  createTime: { type: Date, default: Date.now },

  name: {
    type: String,
    trim: true,
    unique: true,
    match: /^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,8}$/,
    index: true
  },
  avatar: String,
  announcement: {
    type: String,
    default: ''
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
})

export declare interface GroupDocument extends Document {
  _id: Schema.Types.ObjectId
  name: string
  avatar: string
  announcement: string
  creator: UserDocument
  isDefault: boolean
  members: Schema.Types.ObjectId[]
  createTime: Date
}

/**
 * Group Model
 * Group information
 */
const Group = model<GroupDocument>('Group', GroupSchema)

export default Group
