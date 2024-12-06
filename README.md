# Priary
Private and encrypted diary.

Priary is fully written in HTML/CSS/TS, with a mini-framework called JS effects (which is made by me! an older version was previously available [here](https://js-effects.netlify.app).)

## JS Effects
JS Effects is a small library that uses object proxies to provide signals functionality to pure JS without requiring any extra compilation steps.

### JS Effects - Counter example

```html
<h1>Counter demo</h1>

<script>
    const box = scope()
    const { state, htmlEffect } = box
    
    // Create counter
    const counter = state(0)

    // Display counter number
    document.body.appendChild(htmlEffect(`Count: {{count}}`, ['count', counter]))
</script>
    
<br><br>
<button onclick="counter.set(counter.get() + 1)">Increment</button>
```

### JS Effects - TODO list example

```html
<h1>TODO list demo</h1>

<container>
    <ul>
        <li>Loading...</li>
    </ul>
</container>

<script>
    const box = scope()
    const { state, htmlCallbackEffect } = box

    const element = document.querySelector('container')

    // Read TODOs from local storage
    const todos = JSON.parse(localStorage.getItem('todos')) ?? []

    element.innerHTML = ''
    // Render TODO items every time they're changed
    element.appendChild(htmlCallbackEffect(() =>
        '<ul>' + (box.todos.length !== 0 ? box.todos.map((e, i) => `<li>${e}   <a style=` + 
        `"cursor: pointer" onclick="todos.set(todos.get().filter((e, i) => i != ${i}))">Remove</a></li>`
        ).join('') : '<li>No TODOs.</li>') + '</ul>', ['todos', todos]
    ))

    // Save TODOs to local storage on every change
    effect(() => {
        localStorage.setItem('todos', JSON.stringify(todos.get()))
    }, todos)
</script>

<button onclick="let x = prompt(); if(x) todos.set([...todos.get(), x])">Add item</button><br>
<button onclick="todos.set([])">Clear all</button>