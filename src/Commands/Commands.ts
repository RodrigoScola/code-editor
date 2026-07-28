type Command = {
  key: string;
  initialized: Date;
};

type EditorCommand = {
  keys: string[];
    action: () => {
        

  };
};

const newLineCommand: EditorCommand = {
  keys: ["o"],
};

export class Commands {
  check() {}
}
