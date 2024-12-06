import * as Crypto from 'crypto-js'
import scope from './effects'

const Secure = {
    encrypt(value: string, password: string) {
        return Crypto.AES.encrypt(value, password).toString()
    },
    decrypt(value: string, password: string) {
        return Crypto.AES.decrypt(value, password).toString(Crypto.enc.Utf8)
    }
}

type stateType<T> = [
    () => T,
    (value: T) => void,
    stateType<T>,
    string
] & {
    get: () => T;
    set: (value: T) => void;
    name: string;
}

const global = scope()
const { state, effect, immediateEffect } = global

const insecure_storage = state(JSON.parse(localStorage.priary_data ?? '{}'))

function set_prop<T>(state: stateType<any>, prop: string, value: T) {
    state.set({ ...state.get(), [prop]: value })
}

effect(() => {
    localStorage.priary_data = JSON.stringify(insecure_storage.get())
}, insecure_storage)

const secure_storage = state<{ [key: string]: any, typed: TypedData }>({
    typed: {
        entries: []
    }
})

const $ = <K extends keyof HTMLElementTagNameMap>(x: K | string): HTMLElementTagNameMap[K] => document.querySelector(x)!

let last_wrong = false

const input = $('input')

/** Provides a secure scope for containing the hashed password. */
const setup = (async () => {
    let password


    const get_passwd_helper = ((text: string): Promise<string> => new Promise(r => {
        if (last_wrong) input.style.borderColor = '#af3000'

        let txt = ''

        input.placeholder = text
        input.type = 'password'

        // Protect the password from being read by `input.value`.
        const keydownevent = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey || e.altKey)) {
                if (last_wrong) input.style.borderColor = ''

                if (e.key.length === 1) {
                    if (e.shiftKey) txt += e.key.toUpperCase()
                    else txt += e.key
                    input.value = input.value.replace(/./g, '*') + '*'
                }

                if (e.key === 'Backspace') {
                    txt = txt.substring(0, txt.length - 1)
                    input.value = input.value.substring(1)
                }

                if (e.key === 'Enter') {
                    // We got the password.
                    input.type = ''
                    input.placeholder = ''
                    input.value = ''

                    input.removeEventListener('keydown', keydownevent)

                    r(txt)
                }

                e.stopImmediatePropagation()
                e.stopPropagation()
                e.preventDefault()
            }
        }

        input.addEventListener('keydown', keydownevent)
    }))

    const get_passwd = (async (text: string): Promise<string> => {
        const value = await get_passwd_helper(text)

        if(value === '.reload') location.reload()

        return value
    })

    if (!('vault_data' in insecure_storage.get())) {
        password = Crypto.SHA512(await get_passwd('Choose a password...')).toString()

        set_prop(insecure_storage, 'vault_data', Secure.encrypt('{}', password))
        global.secure_storage = {}
    } else {
        password = Crypto.SHA512(await get_passwd(last_wrong ? 'Invalid password!' : 'Enter your password...')).toString()

        try {
            const decrypted = Secure.decrypt(insecure_storage.get().vault_data, password)

            if (!decrypted) {
                last_wrong = true
                return false
            }

            secure_storage.set(JSON.parse(decrypted))
        } catch (e) {
            last_wrong = true
            return false
        }
    }

    effect(() => {
        set_prop(insecure_storage, 'vault_data', Secure.encrypt(JSON.stringify(secure_storage.get()), password))
    }, secure_storage)

    return true
})

type TypedData = {
    /** Message entries. */
    entries: { time: number, text: string }[]
}

while (!(await setup()));

input.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        const text = input.value
        
        if(text === '.erase' && confirm('Do you REALLY want to erase ALL data?')) {
            localStorage.clear()
            location.reload()
        }

        else if (text.length > 0) {
            set_prop(secure_storage, 'typed', {
                entries: [
                    ...secure_storage.get().typed.entries,
                    {
                        time: Date.now(),
                        text
                    }
                ]
            })
        }

        input.value = ''
    }
})

function relativeTime(time: number) {
    if(time === 0) return 'eons ago'
    const diff = Date.now() - time

    if (diff < 1000) return 'just now'
    if (diff < 1000 * 60) return `${Math.floor(diff / 1000)} seconds ago`
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))} minutes ago`
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))} hours ago`
    if (diff < 1000 * 60 * 60 * 24 * 30) return `${Math.floor(diff / (1000 * 60 * 60 * 24))} days ago`
    if (diff < 1000 * 60 * 60 * 24 * 30 * 12) return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 30))} months ago`
    return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 30 * 12))} years ago`
}

input.placeholder = 'Type a message...'

immediateEffect(() => {
    const entries = secure_storage.get().typed.entries
    const container = $('messages')

    const messages: HTMLElement[] = []

    let _i = 0
    for (const entry of entries) {
        let i = _i + 0

        const message = document.createElement('message')
        const text = document.createElement('text')
        const date = document.createElement('date')

        text.innerText = entry.text

        let last_click = 0

        date.innerText = relativeTime(entry.time)
        message['interval'] = setInterval(() => {
            if (Date.now() - last_click > 3000) {
                message.style.background = ''
            }

            // Set relative time
            date.innerText = relativeTime(entry.time)
        }, 1000)

        message.appendChild(text)
        message.appendChild(date)

        message.addEventListener('click', () => {
            if (Date.now() - last_click < 3000) {
                // Remove the message
                const typed = { ...secure_storage.get().typed }
                typed.entries = typed.entries.filter((_, j) => j !== i)
                set_prop(secure_storage, 'typed', typed)
            } else {
                last_click = Date.now()
                message.style.background = '#fa5020'
            }
        })

        messages.push(message)

        _i++
    }

    for (const elm of Array.from(container.querySelectorAll('message'))) {
        clearInterval(elm['interval'])
        elm.remove()
    }

    container.innerHTML = ''

    for (const msg of messages) container.appendChild(msg)
}, secure_storage)


if (!('typed' in secure_storage.get())) {
    set_prop<TypedData>(secure_storage, 'typed', {
        entries: [
            {
                time: 0,
                text: 'Hello! You are now in the priary interface. Double tapping a message deletes it.'
            },
            {
                time: 0,
                text: 'Type ".erase" in the message box and press enter to delete all of your data and restart on a clean slate.'
            }
        ]
    })
}