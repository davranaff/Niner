// @mui
import { enUS } from '@mui/material/locale';

// PLEASE REMOVE `LOCAL STORAGE` WHEN YOU CHANGE SETTINGS.
// ----------------------------------------------------------------------

/** MUI does not ship `uz` locale; `enUS` is used for component strings (DatePicker, DataGrid, …). */
export const allLangs = [
  {
    label: 'English',
    value: 'en',
    systemValue: enUS,
    icon: 'flagpack:gb',
  },
];

export const defaultLang = allLangs[0];

// GET MORE COUNTRY FLAGS
// https://icon-sets.iconify.design/flagpack/
