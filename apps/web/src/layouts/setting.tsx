import Image from 'next/image'
import { MainLayout } from '~/layouts'
import { ComponentProps, useMemo } from 'react'
import { useRouter } from 'next/router'

import { RectangleStackIcon, UserCircleIcon, CogIcon } from '@heroicons/react/24/outline'
import { useUser } from '~/hooks/useAuth'
import Link from 'next/link'
import classNames from 'classnames'
import { Button } from '~/components/common'

interface Props extends Omit<ComponentProps<typeof MainLayout>, 'showTitle' | 'tinyContainer'> {
  a?: string
}

type NavFieldType = {
  url: string
  name: string
  icon: (props: React.ComponentProps<'svg'>) => JSX.Element
  description: string
}

type NavType = {
  title: string
  fields: NavFieldType[]
  adminOnly?: boolean
}

const navList: NavType[] = [
  {
    title: '설정',
    fields: [
      {
        url: '/settings/profile',
        name: '프로필',
        icon: UserCircleIcon,
        description: '개인 프로필을 설정합니다',
      },
      {
        url: '/settings/account',
        name: '계정',
        icon: CogIcon,
        description: '계정을 관리합니다',
      },
    ],
  },
  {
    title: '서버 관리자 설정',
    adminOnly: true,
    fields: [
      {
        url: '/settings/manager/gallery',
        name: '갤러리 카테고리',
        description: '갤러리의 카테고리 및 채널을 설정합니다.',
        icon: RectangleStackIcon,
      },
    ],
  },
]

export const SettingLayout = ({ a, children, ...mainLayoutProps }: Props) => {
  const profile = useUser()
  const { pathname } = useRouter()

  const curPage = useMemo(() => {
    return navList
      .reduce((prev, cur) => prev.concat(cur.fields), [] as NavFieldType[])
      .find((item) => pathname === `${item.url}`)
  }, [pathname])

  return (
    <MainLayout showTitle tinyContainer {...mainLayoutProps}>
      <div className="mb-4 flex items-center">
        <Image
          src={profile?.avatar || ''}
          className="rounded-full"
          alt="profile"
          width={64}
          height={64}
        />
        <div className="ml-4 flex flex-row justify-between w-full items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 text-xl font-bold text-title-color">
              <div className="">{`${profile?.isAdmin ? ' [관리자]' : ''} ${profile?.name}`}</div>
              <div className="mb-1 font-normal text-gray-400">/</div>
              <div>{curPage?.name}</div>
            </div>
            <div className="text-description-color">{curPage?.description}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col divide-y md:divide-y-0 md:grid grid-flow-col gap-x-12">
        <div className="md:col-span-3 flex flex-col gap-x-1 gap-y-2 tracking-wide pb-4 md:pb-0">
          {navList
            .filter(({ adminOnly }) => !adminOnly || profile?.isAdmin)
            .map(({ title, fields }) => (
              <div key={title}>
                <div className="text-lg font-bold text-subtitle-color">{title}</div>
                {fields.map(({ icon: Icon, name, url }) => (
                  <Link href={url} passHref key={url}>
                    <a
                      className={classNames(
                        pathname === url &&
                          'bg-primary-300/50 dark:bg-primary-700/50 border-transparent',
                        'hover:bg-primary-300/50 text-primary-600 hover:dark:bg-primary-700/50 dark:text-primary-300 border-transparent',
                        'transition text-black rounded flex-none text-center border flex gap-x-3 items-center justify-start px-2 py-2 w-full',
                      )}
                    >
                      <div className="text-xl">
                        <Icon width={20} height={20} />
                      </div>
                      <div>{name}</div>
                    </a>
                  </Link>
                ))}
              </div>
            ))}
        </div>
        <div className="pt-4 md:pt-0 md:col-span-9 flex flex-col gap-y-4">{children}</div>
      </div>
    </MainLayout>
  )
}