import React, { useState, useContext } from 'react'
import { useSelector } from 'react-redux'

import Style from './GroupManagePanel.less'
import useIsLogin from '../../hooks/useIsLogin'
import { State, GroupMember } from '../../state/reducer'
import Input from '../../components/Input'
import Button from '../../components/Button'
import Message from '../../components/Message'
import Avatar from '../../components/Avatar'
import Tooltip from '../../components/Tooltip'
import Dialog from '../../components/Dialog'
import { changeGroupName, changeGroupAvatar, deleteGroup, leaveGroup } from '../../service'
import useAction from '../../hooks/useAction'
import readDiskFIle from '../../../utils/readDiskFile'
import config from '../../../config/client'
import uploadFile from '../../../utils/uploadFile'
import { ShowUserOrGroupInfoContext } from '../../context'

interface GroupManagePanelProps {
  visible: boolean
  onClose: () => void
  groupId: string
  avatar: string
  creator: string
  onlineMembers: GroupMember[]
}

function GroupManagePanel(props: GroupManagePanelProps) {
  const { visible, onClose, groupId, avatar, creator, onlineMembers } = props

  const action = useAction()
  const isLogin = useIsLogin()
  const selfId = useSelector((state: State) => state.user._id)
  const [deleteConfirmDialog, setDialogStatus] = useState(false)
  const [groupName, setGroupName] = useState('')
  const context = useContext(ShowUserOrGroupInfoContext)

  async function handleChangeGroupName() {
    const isSuccess = await changeGroupName(groupId, groupName)
    if (isSuccess) {
      Message.success('Group name changed successfully')
      action.setLinkmanProperty(groupId, 'name', groupName)
    }
  }

  async function handleChangeGroupAvatar() {
    const image = await readDiskFIle('blob', 'image/png,image/jpeg,image/gif')
    if (!image) {
      return
    }
    if (image.length > config.maxImageSize) {
      // eslint-disable-next-line consistent-return
      return Message.error('Failed to set group avatar, please select a picture smaller than 1MB')
    }

    try {
      const imageUrl = await uploadFile(
        image.result as Blob,
        `GroupAvatar/${selfId}_${Date.now()}`,
        `GroupAvatar_${selfId}_${Date.now()}.${image.ext}`
      )
      const isSuccess = await changeGroupAvatar(groupId, imageUrl)
      if (isSuccess) {
        action.setLinkmanProperty(groupId, 'avatar', URL.createObjectURL(image.result))
        Message.success('Modify group avatar successfully')
      }
    } catch (err) {
      console.error(err)
      Message.error('Group upload failed')
    }
  }

  async function handleDeleteGroup() {
    const isSuccess = await deleteGroup(groupId)
    if (isSuccess) {
      setDialogStatus(false)
      onClose()
      action.removeLinkman(groupId)
      Message.success('Deleted successfully')
    }
  }

  async function handleLeaveGroup() {
    const isSuccess = await leaveGroup(groupId)
    if (isSuccess) {
      onClose()
      action.removeLinkman(groupId)
      Message.success('Exit group successfully')
    }
  }

  function handleClickMask(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  function handleShowUserInfo(userInfo: any) {
    if (userInfo._id === selfId) {
      return
    }
    context.showUserInfo(userInfo)
    onClose()
  }

  return (
    <div
      className={`${Style.groupManagePanel} ${visible ? 'show' : 'hide'}`}
      onClick={handleClickMask}
      role="button"
      data-float-panel="true"
    >
      <div className={`${Style.container} ${visible ? Style.show : Style.hide}`}>
        <p className={Style.title}>Group information</p>
        <div className={Style.content}>
          {isLogin && selfId === creator ? (
            <div className={Style.block}>
              <p className={Style.blockTitle}>Modify group name</p>
              <Input className={Style.input} value={groupName} onChange={setGroupName} />
              <Button className={Style.button} onClick={handleChangeGroupName}>
                Confirm the changes
              </Button>
            </div>
          ) : null}
          {isLogin && selfId === creator ? (
            <div className={Style.block}>
              <p className={Style.blockTitle}>Modify group avatar</p>
              <img
                className={Style.avatar}
                src={avatar}
                alt="Group Avatar Preview"
                onClick={handleChangeGroupAvatar}
              />
            </div>
          ) : null}

          <div className={Style.block}>
            <p className={Style.blockTitle}>Features</p>
            {selfId === creator ? (
              <Button className={Style.button} type="danger" onClick={() => setDialogStatus(true)}>
                Disband
              </Button>
            ) : (
              <Button className={Style.button} type="danger" onClick={handleLeaveGroup}>
                Leave group
              </Button>
            )}
          </div>
          <div className={Style.block}>
            <p className={Style.blockTitle}>
              Online member &nbsp;<span>{onlineMembers.length}</span>
            </p>
            <div>
              {onlineMembers.map(member => (
                <div key={member.user._id} className={Style.onlineMember}>
                  <div
                    className={Style.userinfoBlock}
                    onClick={() => handleShowUserInfo(member.user)}
                    role="button"
                  >
                    <Avatar size={24} src={member.user.avatar} />
                    <p className={Style.username}>{member.user.username}</p>
                  </div>
                  <Tooltip
                    placement="top"
                    trigger={['hover']}
                    overlay={<span>{member.environment}</span>}
                  >
                    <p className={Style.clientInfoText}>
                      {member.browser}
                      &nbsp;&nbsp;
                      {member.os === 'Windows Server 2008 R2 / 7' ? 'Windows 7' : member.os}
                    </p>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
          <Dialog
            className={Style.deleteGroupConfirmDialog}
            title="Confirm again whether to delete the group?"
            visible={deleteConfirmDialog}
            onClose={() => setDialogStatus(false)}
          >
            <Button
              className={Style.deleteGroupConfirmButton}
              type="danger"
              onClick={handleDeleteGroup}
            >
              Confirm
            </Button>
            <Button
              className={Style.deleteGroupConfirmButton}
              onClick={() => setDialogStatus(false)}
            >
              Cancel
            </Button>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

export default GroupManagePanel
