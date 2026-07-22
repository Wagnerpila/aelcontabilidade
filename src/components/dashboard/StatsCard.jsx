import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const colorVariants = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    icon: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500 dark:bg-blue-400"
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/30", 
    icon: "text-green-600 dark:text-green-400",
    accent: "bg-green-500 dark:bg-green-400"
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/30",
    icon: "text-purple-600 dark:text-purple-400", 
    accent: "bg-purple-500 dark:bg-purple-400"
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500 dark:bg-emerald-400"
  }
};

export default function StatsCard({ title, value, icon: Icon, color, trend, isLoading }) {
  const colors = colorVariants[color] || colorVariants.blue;
  
  if (isLoading) {
    return (
      <Card className="card-shadow dark:bg-gray-800/50 dark:border-purple-700/50 transition-colors duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 dark:bg-gray-700" />
              <Skeleton className="h-8 w-16 dark:bg-gray-700" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl dark:bg-gray-700" />
          </div>
          {trend && <Skeleton className="h-4 w-20 mt-4 dark:bg-gray-700" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className="card-shadow hover-lift relative overflow-hidden dark:bg-gray-800/50 dark:border-purple-700/50 transition-colors duration-300">
        <div className={`absolute top-0 right-0 w-32 h-32 ${colors.accent} opacity-5 dark:opacity-20 rounded-full transform translate-x-12 -translate-y-12 transition-opacity duration-300`} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 transition-colors duration-300">{title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${colors.bg} transition-colors duration-300`}>
              <Icon className={`w-6 h-6 ${colors.icon} transition-colors duration-300`} />
            </div>
          </div>
          {trend && (
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="w-4 h-4 mr-1 text-green-500 dark:text-green-400 transition-colors duration-300" />
              <span className="text-green-600 dark:text-green-400 font-medium transition-colors duration-300">{trend}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}