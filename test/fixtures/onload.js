import bel from 'bel'

const onload = bel`
  <div onload=${onloadHandler} />
`

const onunload = bel`
  <div onunload=${() => { alert('Bye') }} />
`

const both = bel`
  <div onload=${() => console.log('loaded')}
    onunload=${() => console.log('unloaded')}
    />
`
