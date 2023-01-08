import { TRPCError } from '@trpc/server'
import axios from 'axios'
import { ChannelType } from 'discord.js'

import { dbClient } from '@ideaslab/db'
import {
  authCheckHandleValidator,
  authLoginWithPinValidator,
  authLoginWithTokenValidator,
  authSignUpValidator,
  authUpdateProfileValidator,
} from '@ideaslab/validator'

import { loginedProcedure } from '~/api/base/auth-middleware'
import { publicProcedure, router } from '~/api/base/trpc'
import { client, currentGuildMember } from '~/bot/base/client'
import config from '~/config'
import { loginWithPin, loginWithToken } from '~/service/auth'
import { getSetting } from '~/service/setting'
import { ignoreError } from '~/utils'
import { Embed } from '~/utils/embed'

export const authRouter = router({
  loginWithPin: publicProcedure
    .input(authLoginWithPinValidator)
    .mutation(async ({ ctx, input }) => {
      const user = await loginWithPin(input.pin)
      if (!user) return { success: false }

      ctx.session.id = user.userId
      ctx.session.isAdmin = user.isAdmin
      await ctx.session.save()
      return { success: true }
    }),
  loginWithToken: publicProcedure
    .input(authLoginWithTokenValidator)
    .mutation(async ({ ctx, input }) => {
      const user = await loginWithToken(input.token)
      if (!user) return { success: false }

      ctx.session.id = user.userId
      ctx.session.isAdmin = user.isAdmin
      await ctx.session.save()
      return { success: true }
    }),
  logout: loginedProcedure.mutation(({ ctx }) => {
    ctx.session.destroy()
    return { success: true }
  }),
  profile: loginedProcedure.query(async ({ ctx }) => {
    const user = await dbClient.user.findUnique({
      where: { discordId: ctx.session.id },
      select: { discordId: true, avatar: true, roles: true, introduce: true, links: true },
    })

    const member = await currentGuildMember(ctx.session.id)
    const name = member.displayName
    const avatar = member.displayAvatarURL()
    const username = member.user.username
    const discriminator = member.user.discriminator

    if (user && user.avatar !== avatar) {
      await ignoreError(
        dbClient.user.update({
          where: { discordId: ctx.session.id },
          data: {
            avatar,
          },
        }),
      )
    }

    return {
      userId: ctx.session.id,
      isAdmin: ctx.session.isAdmin,
      name,
      avatar,
      username,
      discriminator,
      roles: user?.roles,
      introduce: user?.introduce,
      isVerified: user ? true : false,
      links: user?.links,
    }
  }),
  checkHandle: publicProcedure.input(authCheckHandleValidator).mutation(async ({ input }) => {
    const user = await dbClient.user.findUnique({
      where: { handle: input.handle },
    })
    if (user) return false
    return true
  }),
  signup: loginedProcedure.input(authSignUpValidator).mutation(async ({ ctx, input }) => {
    const res = await axios.post(
      'https://hcaptcha.com/siteverify',
      `response=${input.captcha}&secret=${config.hCaptchaSecretKey}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
      },
    )

    if (res.data.success === false) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '캡챠 인증에 실패하였습니다.' })
    }

    const user = await dbClient.user.findUnique({
      where: { discordId: ctx.session.id },
    })
    if (user) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '이미 가입되어 있습니다.' })
    }

    const member = await currentGuildMember(ctx.session.id)

    if (member.displayName !== input.name) {
      member.setNickname(input.name)
    }

    await dbClient.user.create({
      data: {
        discordId: ctx.session.id,
        avatar: member.displayAvatarURL(),
        name: input.name,
        handle: input.handle,
        introduce: input.introduce,
        registerFrom: input.registerFrom,
        roles: { connect: input.roles.map((id) => ({ id })) },
      },
    })

    const welcomeChannelId = await getSetting('welcomeChannel')
    const welcomeChannel = welcomeChannelId ? client.channels.cache.get(welcomeChannelId) : null
    const welcomeMessage = await getSetting('welcomeMessage')

    if (welcomeChannel && welcomeChannel.type === ChannelType.GuildText) {
      const embed = new Embed(client, 'info')
        .setTitle('새로운 유저가 서버에 참여했어요!')
        .setDescription(welcomeMessage ?? '')
        .addFields({
          name: '자기소개',
          value: `${input.introduce}${input.links.length > 0 ? '\n\n' : ''}${input.links.map(
            ({ name, url }) => `[${name}](${url})`,
          )}`,
        })
        .setAuthor({
          name: input.name,
          iconURL: member.displayAvatarURL(),
          url: `${config.webURL}/@${input.handle}`,
        })
      await welcomeChannel.send({ embeds: [embed] })
    }

    return {
      success: true,
    }
  }),
  updateProfile: loginedProcedure
    .input(authUpdateProfileValidator)
    .mutation(async ({ ctx, input }) => {
      const user = await dbClient.user.findUnique({
        where: { discordId: ctx.session.id },
      })
      if (!user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '가입되어있지 않은 유저의 요청입니다.',
        })
      }

      const member = await currentGuildMember(ctx.session.id)

      if (member.displayName !== input.name) {
        member.setNickname(input.name)
      }

      await dbClient.user.update({
        where: {
          discordId: ctx.session.id,
        },
        data: {
          discordId: ctx.session.id,
          avatar: member.displayAvatarURL(),
          name: input.name,
          handle: input.handle,
          introduce: input.introduce,
          links: input.links,
          roles: { connect: input.roles.map((id) => ({ id })) },
        },
      })

      return {
        success: true,
      }
    }),
})
