import { themeQuartz, iconSetQuartzLight } from "ag-grid-community";

// to use myTheme in an application, pass it to the theme grid option
export const reportAgGridTheme = themeQuartz
  .withPart(iconSetQuartzLight)
  .withParams({
    accentColor: "#087AD1",
    backgroundColor: "#ffffff",
    browserColorScheme: "light",
    columnBorder: false,
    //fontFamily: 'Geist Mono',
    fontFamily: "Plus Jakarta Sans, sans-serif",
    foregroundColor: "rgb(46, 55, 66)",
    headerBackgroundColor: "#F9FAFB",
    headerFontSize: 11,
    headerFontWeight: 600,
    headerTextColor: "#919191",
    oddRowBackgroundColor: "#F9FAFB",
    rowBorder: false,
    sidePanelBorder: false,
    spacing: 8,
    wrapperBorder: false,
    wrapperBorderRadius: 0,
  });
