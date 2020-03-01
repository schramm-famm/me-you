<template>
  <div class="conversation">
    <div class="header">
      <h1>Conversation {{ $route.params.id }}</h1>
      <h2>{{ time }}</h2>
    </div>
    <div id="conversation-body" class="body" contenteditable="true">
    </div>
  </div>
</template>

<script>
const date = new Date();
const hours = date.getHours() % 12;
let minutes = date.getMinutes();
minutes = minutes < 10 ? `0${minutes}` : minutes;
const meridian = date.getHours() < 11 ? 'A.M.' : 'P.M.';

const data = () => ({
  time: `Today at ${hours}:${minutes} ${meridian}`,
});

export default {
  name: 'Conversation',
  data,
};
</script>

<style scoped>
h1 {
  font-size: 12pt;
  font-weight: normal;
  font-style: normal;
  color: black;
  margin: 0px;
}

h2 {
  font-size: 8pt;
  font-weight: normal;
  font-style: normal;
  color: darkgrey;
  margin: 0px;
}

.conversation {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.header {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  height: 3em;
  background-color: white;
  border: solid lightgrey;
  border-width: 0px 0px thin;
  padding: 0px 1em;
}

.body {
  display: inline-block;
  color: black;
  font-size: 10pt;
  padding: 1em;
  height: 100%;
  overflow-y: scroll;
  word-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
}

.body:focus {
  outline: 0px solid transparent;
}
</style>
