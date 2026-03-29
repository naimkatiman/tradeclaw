const LeaderboardSkeleton = () => {
    return Array.from({ length: 6 }).map((_, i) => (
      <tr
        key={i}
        className="border-b border-white/3 animate-pulse"
      >
        <td className="px-4 py-3 w-10">
          <div className="w-6 h-6 bg-white/10 rounded-full mx-auto" />
        </td>
  
        <td className="px-4 py-3">
          <div className="h-3 w-16 bg-white/10 rounded" />
        </td>
  
        <td className="px-4 py-3 text-right">
          <div className="h-3 w-10 bg-white/10 rounded ml-auto" />
        </td>
  
        <td className="px-4 py-3 w-36">
          <div className="h-1 w-full bg-white/10 rounded" />
        </td>
  
        <td className="px-4 py-3 w-36">
          <div className="h-1 w-full bg-white/10 rounded" />
        </td>
  
        <td className="px-4 py-3 w-32">
          <div className="h-1 w-full bg-white/10 rounded" />
        </td>
  
        <td className="px-4 py-3 text-right">
          <div className="h-3 w-12 bg-white/10 rounded ml-auto" />
        </td>
  
        <td className="px-4 py-3">
          <div className="flex justify-center gap-1">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="w-1.5 h-3 bg-white/10 rounded" />
            ))}
          </div>
        </td>
      </tr>
    ));
  };
  
  export default LeaderboardSkeleton;