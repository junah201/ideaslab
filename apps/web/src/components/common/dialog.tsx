import { createContext, Fragment, ReactNode } from 'react'
import { Dialog as HDialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'

import { Button } from './button'
import { TransitionChild } from './transition'

interface DialogContext {
  isOpen: boolean
  close: () => void
}

const dialogContext = createContext<Partial<DialogContext>>({})

const DialogTitle = ({ title }: { title: string }) => {
  return (
    <dialogContext.Consumer>
      {({ close: onClose }) => (
        <HDialog.Title
          as="h3"
          className="w-full px-6 py-5 text-2xl font-medium leading-6 text-title-color flex justify-between items-center"
        >
          <div>{title}</div>
          {onClose && (
            <Button forIcon variant="subtle" onClick={onClose}>
              <span className="sr-only">모달 닫기</span>
              <XMarkIcon className="w-5 h-5" />
            </Button>
          )}
        </HDialog.Title>
      )}
    </dialogContext.Consumer>
  )
}

const DialogContent = ({ children }: { children: ReactNode }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto sm:p-5">
      <div className="flex items-center justify-center text-center h-full min-h-full w-full">
        <TransitionChild type="modal">
          <HDialog.Panel
            className={classNames(
              'bg-base h-full text-base-color w-full max-w-full lg:max-w-4xl transform sm:rounded-xl text-left align-middle shadow-xl backdrop-blur-md transition-all flex flex-col',
            )}
          >
            {children}
          </HDialog.Panel>
        </TransitionChild>
      </div>
    </div>
  )
}

const DialogLoading = ({ children }: { children?: ReactNode }) => {
  return (
    <dialogContext.Consumer>
      {({ close }) => (
        <div
          className="animate-pulse flex flex-col px-8 mt-8 gap-y-4 lg:max-w-4xl"
          role="presentation"
          aria-label="데이터 불러오는중"
        >
          <div className="flex justify-between items-center">
            <div className="h-12 bg-pulse rounded w-48"></div>
            <Button variant="subtle" onClick={close} forIcon>
              <XMarkIcon width={24} height={24} />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialogContext.Consumer>
  )
}

export const Dialog = ({
  isOpen,
  close,
  children,
}: {
  isOpen: boolean
  close: () => void
  children: ReactNode
}) => {
  return (
    <dialogContext.Provider value={{ isOpen, close }}>
      <Transition appear show={isOpen} as={Fragment}>
        <HDialog as="div" className="relative z-10" onClose={close}>
          <TransitionChild type="overlay">
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </TransitionChild>
          {children}
        </HDialog>
      </Transition>
    </dialogContext.Provider>
  )
}

Dialog.Title = DialogTitle
Dialog.Loading = DialogLoading
Dialog.Content = DialogContent
