type Command = {
  key: string;
  initialized: Date;
};

type EditorCommand = {
  keys: string[];
  action: () => {};
};

export class Commands {
  check() {}
}
