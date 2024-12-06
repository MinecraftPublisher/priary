// import { GlobalRegistrator } from '@happy-dom/global-registrator'
// GlobalRegistrator.register()

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

// Unused code

// /** Defines a variable on the current scope with the given name and value. */
// define: <T>(name: string, value: T) => void,
// /** Gets a value from the current scope by name.  */
// get: <T>(name: string) => T,
// /** Creates an effect, which re-runs the given function any time the variable names passed onto it change in the scope. */
// effect(handler: Function, ...values: string[]): void,
// /** Creates an effect, which runs once at the start, and then re-runs the given function any time the variable names passed onto it change in the scope. */
// immediateEffect(handler: Function, ...values: string[]): void,
// /** Creates an HTML effect, which takes HTMl code and returns an element that re-renders itself every time its variables change. Variables may define a custom value callback when they're used in the html with the syntax `{{name}}`. */
// htmlEffect(text: string, ...values: ([string, (newValue: any) => any] | [string])[]): HTMLElement,

type scopeType = {
    /** Creates a state. States are unnamed variables that are more *professional* to work with. */
    state<T>(initial: T): stateType<T>,
    /** Creates an effect, which re-runs the given function any time the states given to it are changed. */
    effect<T>(handler: Function, ...states: stateType<T>[]): void,
    /** Creates an effect, which runs once at the start, and then re-runs the given function any time the states passed onto it change in the scope. */
    immediateEffect<T>(handler: Function, ...values: stateType<T>[]): void,
    /** Returns an HTML element that re-renders itself based on the return value of the callback provided to it when its states change. */
    htmlCallbackEffect(callback: () => string, ...states: stateType<any>[]): HTMLElement,
    /** Creates an HTML effect, which takes HTMl code and returns an element that re-renders itself every time its states change. States may define a custom value callback when they're used in the html with the syntax `{{name}}`. Maps every state to a given name. */
    htmlEffect(text: string, ...states: ([string, stateType<any>] | [
        string,
        stateType<any>,
        (newValue: any) => any
    ])[]): HTMLElement
} & { [key: string]: any }

function scope(object = {}): scopeType {
    let effects = {}

    function makeid(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length

        let result = ''
        let counter = 0

        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength))
            counter += 1
        }

        return result
    }

    function __htmlEffect(text: string, ...values: ([string, (newValue: any) => any] | [string])[]): HTMLElement {
        const element = document.createElement('any')
        let matches = (text.match(new RegExp(`{{\\s?[a-zA-Z_$][a-zA-Z0-9_$]*\\s?}}`, 'g')) ?? []).map(e => e.substring(2, e.length - 2))
        matches = [...new Set([...matches, ...values.map(e => e[0])])]

        let removed = false
        let $values = {}

        function renderText() {
            if (removed) return
            let newText = text

            for (let hook of matches) {
                let value = source[hook]
                if ($values[hook]) value = $values[hook](value)
                if (typeof value === 'undefined') value = '{{undefined}}'
                else value = typeof value === 'object' ? JSON.stringify(value) : value.toString()

                if (!hook.startsWith('$')) {
                    const any = document.createElement('any')
                    any.innerText = value
                    value = any.innerHTML
                    any.remove()
                }

                newText = newText.replaceAll(`{{${hook}}}`, value)
            }

            if (removed) return // double-check. just to be sure.
            element.innerHTML = newText
        }

        for (let hook of matches) {
            if (!source.hasOwnProperty(hook)) throw new SyntaxError(`Error whilst hooking to htmlEffect: Couldn't find '${hook}' in scope source.`)
            if (!effects.hasOwnProperty(hook)) effects[hook] = []
            effects[hook].push(renderText)
        }

        for (let value of values) if (value[1]) $values[value[0]] = value[1]

        const mainRemove = element.remove
        element.remove = () => {
            removed = true

            for (let hook of matches) {
                effects[hook] = effects[hook].filter(e => e.toString() != renderText.toString())
            }

            mainRemove()
        }

        renderText()
        return element
    }

    let source: scopeType = new Proxy({
        ...object,
        // define: <T>(name: string, value: T): void => { source[name] = value },
        // get: <T>(name: string): T => source[name],
        // effect(handler: Function, ...values: string[]): void {
        //     if (values.length > 0) {
        //         for (let value of values) {
        //             if (effects[value]) effects[value].push(handler)
        //             else effects[value] = [handler]
        //         }

        //         return
        //     }

        //     console.error('Auto-detecting objects hooked by the effect function is experimental and may result in inaccuracies.')

        //     let list: string[] = []

        //     let text = handler.toString()
        //     for (let object of Object.keys(source)) {
        //         if (['define', 'get', 'effect'].includes(object)) continue

        //         let regex = new RegExp(`\\b${object}\\b`)
        //         if (!regex.test(text)) continue

        //         if (effects[object]) effects[object].push(handler)
        //         else effects[object] = [handler]

        //         list.push(object)
        //     }

        //     console.error('Finished auto-hooking. Found:', JSON.stringify(list, null, 4))
        //     console.error('This list may be incomplete or incorrect. Please note that this behavior is experimental.')
        // },
        // immediateEffect(handler: Function, ...values: string[]): void {
        //     source.effect(handler, ...values)
        //     handler()
        // },
        /** Returns an array with some set properties. The first index acts as a GET function, the second a SET function, the third is the value itself and the fourth is the state name. */
        state<T>(initial: T): stateType<T> {
            let name = `state_${makeid(50)}`
            source[name] = initial

            effects[name] = []

            let value: any = [
                () => source[name],
                // effect system not required here, since the proxy system takes care of it.
                (value) => source[name] = value,
                undefined,
                name
            ]

            value.get = value[0]
            value.set = value[1]
            value.name = value[3]
            value[2] = value

            return value
        },
        effect<T>(handler: Function, ...states: stateType<T>[]) {
            for (let state of states) {
                effects[state.name].push(handler)
            }
        },
        immediateEffect<T>(handler: Function, ...states: stateType<T>[]) {
            for (let state of states) {
                effects[state.name].push(handler)
            }

            handler()
        },
        htmlCallbackEffect(callback: () => string, ...states: stateType<any>[]): HTMLElement {
            const elm = document.createElement('any')

            let removed = false

            function renderText() {
                if (removed) return

                let value = callback()

                if (removed) return // double check!
                elm.innerHTML = value
            }

            renderText()

            for (let hook of states) {
                if (!source.hasOwnProperty(hook.name)) throw new SyntaxError(`Error whilst hooking to htmlEffect: Couldn't find '${hook}' in scope source.`)
                if (!effects.hasOwnProperty(hook.name)) effects[hook.name] = []
                effects[hook.name].push(renderText)
            }

            const mainRemove = elm.remove
            elm.remove = () => {
                removed = true

                for (let hook of states) {
                    effects[hook.name] = effects[hook.name].filter(e => e.toString() != renderText.toString())
                }

                mainRemove()
            }

            return elm
        },
        htmlEffect(text: string, ...states: ([string, stateType<any>] |
        [string, stateType<any>, (newValue: any) => any])[]): HTMLElement {
            let finalText = text
            let finalValues: [string, ((newValue: any) => any)][] = []

            for (let state of states) {
                finalText = finalText.replaceAll(`{{${state[0]}}}`, `{{${state[1].name}}}`)
                if (state.length === 3) finalValues.push([state[0], state[2]])
            }

            return source.__htmlEffect(finalText, ...finalValues)
        }
    }, {
        has: (target, prop) => (prop.toString() === 'effects' || prop.toString() === 'source') ? true : !!target[prop],
        get: (target, prop, receiver) => (prop.toString() === 'effects') ? undefined : target[prop],
        set(target, prop, value, receiver) {
            let last = target[prop]
            target[prop] = value

            if (!effects.hasOwnProperty(prop.toString())) return true
            for (let effect of effects[prop.toString()] ?? []) effect()
            return true
        }
    })

    return source
}

export default scope