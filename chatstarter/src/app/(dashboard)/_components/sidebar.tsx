import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { PlusIcon, User2Icon } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { NewDirectMessage } from "./new-direct-message";
import { use } from "react";
import { usePathname } from "next/navigation";

export function DashboardSidebar() {
  const user = useQuery(api.functions.user.get);
  const directMessages = useQuery(api.functions.dm.list);
  const pathname = usePathname();

  if (!user) {
    return null;
  }
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/">
                    <User2Icon />
                    Friends
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarGroup>
            <SidebarGroupLabel>Direct Messages</SidebarGroupLabel>
            <NewDirectMessage />
            <SidebarGroupContent>
              <SidebarMenu>
                {/* for each direct msg, directMessages will be an optional property. will be undefined for a sec while its loading*/}
                {directMessages?.map((directMessage) => (
                  <SidebarMenuItem key={directMessage._id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/dms/${directMessage._id}`}
                    >
                      <Link href={`/dms/${directMessage._id}`}>
                        <Avatar className="size-6">
                          <AvatarImage src={directMessage.user.image} />
                          <AvatarFallback>
                            {directMessage.user.username[0]}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium">
                          {directMessage.user.username}
                        </p>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {/* asChild means that the button below will serve as the DropdownMenuTrigger */}
                    <SidebarMenuButton className="flex items-center">
                      <Avatar className="size-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                        {/* fallback for the user initials */}
                      </Avatar>
                      <p className="font-medium">{user.username}</p>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <SignOutButton />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
