const getAll = () => Promise.resolve([
  {
    id: 5,
    name: 'Friends',
    avatar_url: 'https://i.redd.it/o6i20msl7wcz.jpg',
    last_modified: (new Date()).toISOString().replace('T', ' ').replace('Z', ''),
  },
  {
    id: 7,
    name: 'Family',
    avatar_url: 'https://i.redd.it/o6i20msl7wcz.jpg',
    last_modified: '2020-02-29 13:00:01',
  },
]);

export default {
  getAll,
};
