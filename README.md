## Flowblade

Data store and transformation library for data-driven applications.

### Core

| Datasource                                                                                  | Description                           |
|---------------------------------------------------------------------------------------------|---------------------------------------|
| [@flowblade/core](https://github.com/belgattitude/flowblade/tree/main/packages/core#readme) | Base contracts, interfaces and utils. |

### Datasources

| Datasource                                                                                                    | Description              |
|---------------------------------------------------------------------------------------------------------------|--------------------------|
| [@flowblade/source-kysely](https://github.com/belgattitude/flowblade/tree/main/packages/source-kysely#readme) | Kysely datasource reader |
| [@flowblade/source-duckdb](https://github.com/belgattitude/flowblade/tree/main/packages/source-duckdb#readme) | Duckdb nodejs datasource |


### Utilities

| Utilities                                                                                                       | Description                                     |
|-----------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| [@flowblade/sql-tag](https://github.com/belgattitude/flowblade/tree/main/packages/sql-tag#readme)               | Tagged SQL template literal                     |
| [@flowblade/sql-tag-format](https://github.com/belgattitude/flowblade/tree/main/packages/sql-tag-format#readme) | Tagged SQL template literal formatter utilities |


## Structure

```
.
├── examples
│   │── apps  
│   │   │── fastify-app
│   │   └── nextjs-app
│   └── shared  
│       │── db-sqlserver 
│       └── duckdb-openfoodfact
└── packages
    │── source-duckdb
    │── source-kysely
    │── sql-tag
    │── sql-tag-format
    └── (...)
```

## Contributors

Contributions are welcome. Take a look to the [CONTRIBUTING](https://github.com/belgattitude/flowblade/blob/main/CONTRIBUTING.md) docs or skip and try

## Support

Don't hesitate and open [an issue](https://github.com/belgattitude/flowblade/issues).

## Sponsors

[Sponsor](<[sponsorship](https://github.com/sponsors/belgattitude)>), [coffee](<(https://ko-fi.com/belgattitude)>), or star – Thanks for being awesome! 🙏❤️

### Special thanks to

<table>
  <tr>
    <td>
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">
         <img width="65" src="https://asset.brandfetch.io/idarKiKkI-/id53SttZhi.jpeg" alt="Jetbrains logo" />
      </a>
    </td>
    <td>
      <a href="https://www.embie.be/?ref=belgattitude" target="_blank">
        <img width="65" src="https://avatars.githubusercontent.com/u/98402122?s=200&v=4" alt="Jetbrains logo" />    
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://www.jetbrains.com/?ref=belgattitude" target="_blank">JetBrains</a>
    </td>
    <td align="center">
      <a href="https://www.embie.be/?ref=belgattitude" target="_blank">Embie.be</a>
    </td>
   </tr>
</table>

## License

MIT © [Sébastien Vanvelthem](https://github.com/belgattitude) and contributors.
