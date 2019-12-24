import { Schema, model, Document } from 'mongoose'

const UserSchema = new Schema({
  createTime: { type: Date, default: Date.now },
  lastLoginTime: { type: Date, default: Date.now },

  username: {
    type: String,
    trim: true,
    unique: true,
    match: /^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,8}$/,
    index: true
  },
  salt: String,
  password: String,
  avatar: String,
  tag: {
    type: String,
    default: '',
    trim: true,
    match: /^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,5}$/
  },
  expressions: [
    {
      type: String
    }
  ]
})

export interface UserDocument extends Document {
  _id: Schema.Types.ObjectId
  username: string
  salt: string
  password: string
  avatar: string
  tag: string
  expressions: string[]
  createTime: Date
  lastLoginTime: Date
}

const User = model<UserDocument>('User', UserSchema)

export default User
