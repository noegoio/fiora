import assert from 'assert'
import { Types } from 'mongoose'

import Group, { GroupDocument } from '../models/group'
import Socket from '../models/socket'
import Message from '../models/message'

import config from '../../config/server'
import getRandomAvatar from '../../utils/getRandomAvatar'
import { KoaContext } from '../../types/koa'

const { isValid } = Types.ObjectId

async function getGroupOnlineMembersHelper(group: GroupDocument) {
  const sockets = await Socket.find(
    { user: group.members },
    {
      os: 1,
      browser: 1,
      environment: 1,
      user: 1
    }
  ).populate('user', { username: 1, avatar: 1 })
  const filterSockets = sockets.reduce((result, socket) => {
    result[socket.user.toString()] = socket
    return result
  }, {})
  return Object.values(filterSockets)
}

interface CreateGroupData {
  name: string
}

export async function createGroup(ctx: KoaContext<CreateGroupData>) {
  const ownGroupCount = await Group.count({ creator: ctx.socket.user })
  assert(
    ownGroupCount < config.maxGroupsCount,
    `Group creation failed, you have already created ${config.maxGroupsCount} groups`
  )

  const { name } = ctx.data
  assert(name, 'Group name cannot be empty')

  const group = await Group.findOne({ name })
  assert(!group, 'The group already exists')

  let newGroup = null
  try {
    newGroup = await Group.create({
      name,
      avatar: getRandomAvatar(),
      creator: ctx.socket.user,
      members: [ctx.socket.user]
    })
  } catch (err) {
    if (err.name === 'ValidationError') {
      return 'Group name contains unsupported characters or is longer than the limit'
    }
    throw err
  }

  ctx.socket.join(newGroup._id)
  return {
    _id: newGroup._id,
    name: newGroup.name,
    avatar: newGroup.avatar,
    createTime: newGroup.createTime,
    creator: newGroup.creator
  }
}

interface JoinGroupData {
  groupId: string
}

/**
 * Join group
 * @param ctx Context
 */
export async function joinGroup(ctx: KoaContext<JoinGroupData>) {
  const { groupId } = ctx.data
  assert(isValid(groupId), 'Invalid group id')

  const group = await Group.findOne({ _id: groupId })
  assert(group, 'Failed to join the group, the group does not exist')
  assert(group.members.indexOf(ctx.socket.user) === -1, 'You are already in the group')

  group.members.push(ctx.socket.user)
  await group.save()

  const messages = await Message.find(
    { toGroup: groupId },
    {
      type: 1,
      content: 1,
      from: 1,
      createTime: 1
    },
    { sort: { createTime: -1 }, limit: 3 }
  ).populate('from', { username: 1, avatar: 1 })
  messages.reverse()

  ctx.socket.join(group._id.toString())

  return {
    _id: group._id,
    name: group.name,
    avatar: group.avatar,
    createTime: group.createTime,
    creator: group.creator,
    messages
  }
}

interface LeaveGroupData {
  groupId: string
}

/**
 * Leave group
 * @param ctx Context
 */
export async function leaveGroup(ctx: KoaContext<LeaveGroupData>) {
  const { groupId } = ctx.data
  assert(isValid(groupId), 'Invalid group id')

  const group = await Group.findOne({ _id: groupId })
  assert(group, 'Group does not exist')

  // Default group has no creator
  if (group.creator) {
    assert(
      group.creator.toString() !== ctx.socket.user.toString(),
      'The owner cannot leave the group he created'
    )
  }

  const index = group.members.indexOf(ctx.socket.user)
  assert(index !== -1, 'You are not in the group')

  group.members.splice(index, 1)
  await group.save()

  ctx.socket.leave(group._id.toString())

  return {}
}

interface GetGroupOnlineMembersData {
  groupId: string
}

/**
 * Get group members online
 * @param ctx Context
 */
export async function getGroupOnlineMembers(ctx: KoaContext<GetGroupOnlineMembersData>) {
  const { groupId } = ctx.data
  assert(isValid(groupId), 'Invalid group id')

  const group = await Group.findOne({ _id: groupId })
  assert(group, '群组不存在')
  return getGroupOnlineMembersHelper(group)
}

/**
 * Get online members of the default group
 * No login required
 */
export async function getDefaultGroupOnlineMembers() {
  const group = await Group.findOne({ isDefault: true })
  assert(group, '群组不存在')
  return getGroupOnlineMembersHelper(group)
}

interface ChangeGroupAvatarData {
  /** Target group id */
  groupId: string
  /** New avatar */
  avatar: string
}

/**
 * Modify group avatar, only the group creator has permission
 * @param ctx Context
 */
export async function changeGroupAvatar(ctx: KoaContext<ChangeGroupAvatarData>) {
  const { groupId, avatar } = ctx.data
  assert(isValid(groupId), 'Invalid group id')
  assert(avatar, 'Avatar address cannot be empty')

  const group = await Group.findOne({ _id: groupId })
  assert(group, 'Group does not exist')
  assert(
    group.creator.toString() === ctx.socket.user.toString(),
    'Only the owner can modify the avatar'
  )

  await Group.updateOne({ _id: groupId }, { avatar })
  return {}
}

interface ChangeGroupNameData {
  /** Target group id */
  groupId: string
  /** New name */
  name: string
}

/**
 * Modify group avatar, only the group creator has permission
 * @param ctx Context
 */
export async function changeGroupName(ctx: KoaContext<ChangeGroupNameData>) {
  const { groupId, name } = ctx.data
  assert(isValid(groupId), 'Invalid group id')
  assert(name, 'Group name cannot be empty')

  const group = await Group.findOne({ _id: groupId })
  assert(group, 'Group does not exist')
  assert(group.name !== name, 'The new group name cannot be the same as before')
  assert(
    group.creator.toString() === ctx.socket.user.toString(),
    'Only the owner can modify the avatar'
  )

  const targetGroup = await Group.findOne({ name })
  assert(!targetGroup, 'The group name already exists')

  await Group.updateOne({ _id: groupId }, { name })

  ctx.socket.to(groupId).emit('changeGroupName', { groupId, name })

  return {}
}

interface DeleteGroupData {
  /** Target group id */
  groupId: string
}

/**
 * Delete group, only the group creator has permission
 * @param ctx Context
 */
export async function deleteGroup(ctx: KoaContext<DeleteGroupData>) {
  const { groupId } = ctx.data
  assert(isValid(groupId), 'Invalid group id')

  const group = await Group.findOne({ _id: groupId })
  assert(group, 'Group does not exist')
  assert(
    group.creator.toString() === ctx.socket.user.toString(),
    'Only the owner can dissolve the group'
  )
  assert(group.isDefault !== true, 'Dismissal of default group is not allowed')

  await group.remove()

  ctx.socket.to(groupId).emit('deleteGroup', { groupId })

  return {}
}
