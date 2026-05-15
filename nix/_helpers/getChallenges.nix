self:

builtins.readDir "${self}/src"
|> builtins.attrNames
|> builtins.concatMap (
  category:
  (
    builtins.readDir "${self}/src/${category}"
    |> builtins.attrNames
    |> map (chall: {
      inherit category chall;
      src = builtins.path { path = "${self}/src/${category}/${chall}"; };
    })
  )
)
