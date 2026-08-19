"use client";

import { MultiSelect } from "primereact/multiselect";
import { useState } from "react";
import type { FC } from "react";

import { cn } from "../utils";

interface City {
  name: string;
  code: string;
}
const cities: City[] = [
  { code: "NY", name: "New York" },
  { code: "RM", name: "Rome" },
  { code: "LDN", name: "London" },
  { code: "IST", name: "Istanbul" },
  { code: "PRS", name: "Paris" },
];

interface Props {
  className?: string | undefined;
}
export const CityMultiSelect: FC<Props> = (props) => {
  const { className } = props;
  const [selectedCities, setSelectedCities] = useState<City[]>();

  return (
    <div className={cn("", className)}>
      <MultiSelect
        value={selectedCities}
        onChange={(e) => setSelectedCities(e.value as City[])}
        options={cities}
        optionLabel="name"
        display="chip"
        placeholder="Select Cities"
        maxSelectedLabels={3}
        filter={true}
        className="w-full"
      />
    </div>
  );
};
