import { dbClient } from '@ideaslab/db'

import { currentGuildMember } from '~/bot/base/client'
import { Button } from '~/bot/base/interaction'
import config from '~/config'
import { getLoginToken } from '~/service/auth'
import { getSetting } from '~/service/setting'
import { Embed } from '~/utils/embed'

export default new Button(['register-complete'], async (client, interaction) => {
  const user = await dbClient.user.findUnique({ where: { discordId: interaction.user.id } })
  if (user) {
    const userRole = await getSetting('userRole')
    await interaction.reply({
      content: '아이디어스 랩에 다시 돌아오신것을 진심으로 환영합니다.',
      ephemeral: true,
    })
    if (userRole) {
      const member = await currentGuildMember(interaction.user.id)
      await member.roles.add(userRole)
    }
    return
  }
  const token = await getLoginToken(
    interaction.user.id,
    `${interaction.user.username}#${interaction.user.discriminator}`,
    interaction.user.displayAvatarURL(),
    false,
  )

  const embed = new Embed(client, 'success')
    .setTitle('아이디어스랩 가입 완료하기 [여기를 클릭]')
    .setURL(`${config.webURL}/signup?token=${token.token}`)
    .addFields({
      name: '기타',
      value: `관리자이시군요! 관리자 권한이 함께 설정되었어요.`,
    })
    .setFooter({ text: '링크는 10분 후 만료됩니다.' })

  interaction.reply({ embeds: [embed], ephemeral: true })
})
