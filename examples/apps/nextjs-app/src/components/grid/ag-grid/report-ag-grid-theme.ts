import { themeQuartz, iconSetQuartzLight } from "ag-grid-community";

import { fontPlusJakartaSans } from "@/components/fonts/font-plus-jakarta-sans.tsx";

// to use myTheme in an application, pass it to the theme grid option
export const reportAgGridTheme = themeQuartz
  .withPart(iconSetQuartzLight)
  .withParams({
    accentColor: "#087AD1",
    backgroundColor: "#ffffff",
    browserColorScheme: "light",
    columnBorder: false,
    //fontFamily: 'Geist Mono',
    // next/font generates its own family name, use it to get all the weights
    fontFamily: `${fontPlusJakartaSans.style.fontFamily}, sans-serif`,
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
