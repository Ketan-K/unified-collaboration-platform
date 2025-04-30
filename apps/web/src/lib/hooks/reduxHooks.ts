import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';

/**
 * Typed version of useDispatch hook
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed version of useSelector hook
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Typed version of useSelector with shallowEqual comparison
 * Use this when selecting arrays or objects to prevent unnecessary rerenders
 */
export const useAppSelectorWithShallowEqual: TypedUseSelectorHook<RootState> = 
  (selector) => useSelector(selector, shallowEqual);

/**
 * Custom hook for creating bound action creators
 */
export const useAppAction = <T extends (...args: any[]) => any>(action: T) => {
  const dispatch = useAppDispatch();
  return (...args: Parameters<T>) => dispatch(action(...args));
};