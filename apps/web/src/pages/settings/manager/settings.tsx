import type { NextPage } from 'next'
import { SettingLayout } from '~/layouts'
import { Form, FormFieldBuilder, Input } from '~/components/form'
import { useForm } from '~/hooks/useForm'
import { adminSaveSettingsValidator, z } from '@ideaslab/validator'
import { trpc } from '~/lib/trpc'
import { Control, useFieldArray, UseFormRegister } from 'react-hook-form'
import { Button } from '~/components/common'
import { FormBlock } from '~/components/form/form-block'
import { ChannelSelector } from '~/components/channel-selector'
import { RoleSelector } from '~/components/role-selector'
import { toast } from 'react-hot-toast'
import { appRouter } from '~/../../server/src/router/_app'
import { useEffect, useMemo } from 'react'

const SettingsPage: NextPage = () => {
  const { data: settings } = trpc.admin.loadSettings.useQuery(undefined, { trpc: { ssr: false } })

  const saveSettings = trpc.admin.saveSettings.useMutation()
  const form = useForm(adminSaveSettingsValidator, {
    onSubmit: async (data) => {
      const fetchData = data.settings.filter((item) => {
        const target = settings?.find((category) => category.key === item.key)
        if (!target) return true

        if (item.value === target.value) return false

        return true
      })
      await saveSettings.mutateAsync({ settings: fetchData })
      toast.success('저장')
    },
    onInvalid: (data) => {
      toast.error(JSON.stringify(data))
    },
  })

  useEffect(() => {
    if (form.getValues()?.settings?.length > 0) return
    if (!settings) return
    form.setValue(
      'settings',
      settings.map(({ key, value }) => ({ key, value })),
    )
  }, [form, settings])

  const {
    control,
    registerForm,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form

  return (
    <SettingLayout title="서비스 설정" guard="adminOnly">
      <Form form={form} className="pt-4 md:pt-0 md:col-span-9 flex flex-col gap-y-4">
        <FieldArray
          settings={settings ?? []}
          control={control}
          register={registerForm}
          error={errors.settings?.message ?? ''}
        />
        <div className="flex justify-end gap-x-2">
          <Button
            disabled={!isDirty}
            onClick={() => {
              reset()
            }}
          >
            취소
          </Button>
          <Button variant="primary" type="submit" disabled={!isDirty} loading={isSubmitting}>
            저장
          </Button>
        </div>
      </Form>
    </SettingLayout>
  )
}

const FieldArray = ({
  control,
  register,
  error,
  settings,
}: {
  settings: typeof appRouter.admin.loadSettings['_def']['_output_out']
  control: Control<z.TypeOf<typeof adminSaveSettingsValidator>>
  register: UseFormRegister<z.TypeOf<typeof adminSaveSettingsValidator>>
  error: string
}) => {
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: 'settings',
  })

  const settingMap = useMemo(
    () =>
      settings.reduce(
        (acc, cur) => ({
          ...acc,
          [cur.key]: cur,
        }),
        {} as Record<string, typeof settings[number]>,
      ),
    [settings],
  )

  const Item = ({
    field,
    index,
    disable = false,
    defaultValue,
  }: {
    defaultValue?: any
    field?: any
    index?: number
    disable?: boolean
  }) => {
    if (disable) {
      return <Input value={defaultValue} className="w-full mb-2" />
    }

    if (!field || index === undefined) return <></>

    switch (settingMap[field.key].type) {
      case 'channel':
        return (
          <FormFieldBuilder name={`settings.${index}.value`}>
            {({ field: { onChange, onBlur, value }, error }) => (
              <ChannelSelector error={error} onChange={onChange} onBlur={onBlur} value={value} />
            )}
          </FormFieldBuilder>
        )
      case 'role':
        return (
          <FormFieldBuilder name={`settings.${index}.value`}>
            {({ field: { onChange, onBlur, value }, error }) => (
              <RoleSelector error={error} onChange={onChange} onBlur={onBlur} value={value} />
            )}
          </FormFieldBuilder>
        )
      case 'tag':
        return <Input {...register(`settings.${index}.value`)} className="w-full" />
      case 'string':
        return <Input {...register(`settings.${index}.value`)} className="w-full" />
      default:
        return <></>
    }
  }

  return (
    <div className="mb-2 space-y-2">
      {fields.map((field, index) => (
        <FormBlock
          key={field.id}
          label={settingMap[field.key].key}
          description={settingMap[field.key].description}
        >
          <Item field={field} index={index} />
        </FormBlock>
      ))}
    </div>
  )
}

export default SettingsPage
