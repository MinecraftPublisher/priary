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
const { state, effect, htmlEffect, htmlCallbackEffect } = global

const insecure_storage = state(JSON.parse(localStorage.priary_data ?? '{}'))

function set_prop<T>(state: stateType<any>, prop: string, value: T) {
    state.set({ ...state.get(), [prop]: value })
}

effect(() => {
    localStorage.priary_data = JSON.stringify(insecure_storage.get())
}, insecure_storage)

const secure_storage = state<{[key: string]: any, typed: TypedData }>({
    typed: {
        entries: []
    }
})

// Run this on startup or on invalid password.
/** Provides a secure scope for containing the hashed password. */
const setup = (() => {
    let password

    if (!('vault_data' in insecure_storage.get())) {
        password = Crypto.SHA512(prompt('Choose a password:')).toString()

        set_prop(insecure_storage, 'vault_data', Secure.encrypt('{}', password))
        global.secure_storage = {}
    } else {
        password = Crypto.SHA512(prompt('Input password:')).toString()

        const decrypted = Secure.decrypt(insecure_storage.get().vault_data, password)
        if(!decrypted) {
            alert('Invalid password!')
            return false
        }
        secure_storage.set(JSON.parse(decrypted))
    }

    effect(() => {
        set_prop(insecure_storage, 'vault_data', Secure.encrypt('{}', password))
    }, secure_storage)

    return true
})

type TypedData = {
    /** Message entries. */
    entries: { time: number, text: string, hidden: boolean }[]
}

if(setup()) {
    if(!('typed' in secure_storage.get())) {
        set_prop<TypedData>(secure_storage, 'typed', {
            entries: []
        })
    }

    // global.secure_storage.typed
    console.log(secure_storage.get(), insecure_storage.get())
}