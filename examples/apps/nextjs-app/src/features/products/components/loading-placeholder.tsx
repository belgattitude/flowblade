"use client";

import type { FC } from "react";

import { useDispatch } from "@/redux/redux-hooks";

export const LoadingPlaceholder: FC = () => {
  const _dispatch = useDispatch();
  /*
  useEffect(() => {
    dispatch(productFiltersSlice.actions.startLoading());
  }, []);
  */

  return (
    <div className="min-h-screen flex-1 rounded-xl bg-muted/50 text-3xl md:min-h-min">
      Loading...
    </div>
  );
};
