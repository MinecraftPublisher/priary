import cryptoJs, * as Crypto from 'crypto-js'
import scope from './effects'

const Secure = {
    encrypt(value: string, password: string) {
        return Crypto.AES.encrypt(value, password).toString()
    },
    decrypt(value: string, password: string) {
        return Crypto.AES.decrypt(value, password).toString(Crypto.enc.Utf8)
    }
}

const global = scope()
const { get, define, immediateEffect, effect, htmlEffect, htmlCallbackEffect } = global
define('insecure_storage', JSON.parse(localStorage.priary_data ?? '{}'))

immediateEffect(() => {
    localStorage.priary_data = JSON.stringify(global.insecure_storage)
}, 'insecure_storage');

// Run this on startup or on invalid password.
const setup = (() => {
    let password

    if (!('vault_data' in global.insecure_storage)) {
        password = prompt('Choose a password:')

        console.log(Secure.encrypt('{}', password))
        global.insecure_storage = { ...global.insecure_storage, vault_data: Secure.encrypt('{}', password) }
        global.secure_data = {}
    } else {
        password = prompt('Input password:')

        const decrypted = Secure.decrypt(global.insecure_storage.vault_data, password)
        if(!decrypted) {
            alert('Invalid password!')
            return false
        }
        global.secure_data = JSON.parse(decrypted)
    }

    effect(() => {
        global.insecure_storage = { ...global.insecure_storage, vault_data: Secure.encrypt('{}', password) }
    }, 'secure_data')

    return true
})

console.log(setup())