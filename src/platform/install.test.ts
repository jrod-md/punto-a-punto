import { expect,it } from 'vitest';
import { needsIosInstallTip,requestPersistentStorage } from './install';
it('offers the tip once in iOS Safari and recognizes iPad desktop agents',()=>{
  expect(needsIosInstallTip('iPhone Safari','iPhone',1,false,false)).toBe(true);
  expect(needsIosInstallTip('Macintosh Safari','MacIntel',5,false,false)).toBe(true);
  expect(needsIosInstallTip('iPhone Safari','iPhone',1,true,false)).toBe(false);
  expect(needsIosInstallTip('iPhone Safari','iPhone',1,false,true)).toBe(false);
  expect(needsIosInstallTip('iPhone CriOS Safari','iPhone',1,false,false)).toBe(false);
  expect(needsIosInstallTip('Chrome Safari','Win32',0,false,false)).toBe(false);
});
it('does not surface denial, missing APIs or persistence errors',async()=>{
  expect(await requestPersistentStorage()).toBe(false);expect(await requestPersistentStorage({async persist(){throw new Error('no');}})).toBe(false);
  expect(await requestPersistentStorage({async persist(){return false;}})).toBe(false);expect(await requestPersistentStorage({async persist(){return true;}})).toBe(true);
});
